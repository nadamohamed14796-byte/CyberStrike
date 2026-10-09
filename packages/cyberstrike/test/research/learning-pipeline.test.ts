import { expect, test } from "bun:test"
import { ReportKnowledge } from "../../src/learning/report-knowledge"
import { Learning } from "../../src/learning/learning"
import { syncResearchSource } from "../../src/research/ingest"

function article(title: string, link: string) {
  return `<!doctype html><html><head><title>${title}</title></head><body>
    <h1>${title}</h1>
    <p>An insecure direct object reference occurred because the application verified that the caller was authenticated but did not check ownership of the requested record.
    The weakness allows a user to change the object identifier in a request and read private profile information belonging to another account.
    Reproduce only with authorized test accounts, compare the response for the same object under two separate users, and retain the minimum evidence needed to show the authorization failure.</p>
    <a href="${link}">Related research</a>
  </body></html>`
}

async function withFetch(implementation: typeof fetch, run: () => Promise<void>) {
  const original = globalThis.fetch
  globalThis.fetch = implementation
  try {
    await run()
  } finally {
    globalThis.fetch = original
  }
}

test("runs source discovery through persistence and recommendations, is idempotent, and enforces depth", async () => {
  const requested: string[] = []
  await withFetch(
    (async (input) => {
      const url = new URL(input instanceof Request ? input.url : String(input))
      requested.push(url.toString())

      if (url.pathname === "/sitemap.xml") {
        return new Response(
          "<urlset><url><loc>https://research.example/writeups/pipeline-follow-up</loc></url></urlset>",
          { status: 200, headers: { "content-type": "application/xml" } },
        )
      }
      if (url.pathname === "/writeups/pipeline-first") {
        return new Response(
          article("PipelineE2EMarker IDOR first research", "/writeups/pipeline-follow-up"),
          { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
        )
      }
      if (url.pathname === "/writeups/pipeline-follow-up") {
        return new Response(
          article("PipelineE2EMarker IDOR follow-up research", "/writeups/pipeline-first"),
          { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
        )
      }
      if (url.pathname === "/writeups/depth-boundary") {
        return new Response(
          article("DepthBudgetMarker IDOR depth boundary", "/writeups/depth-child"),
          { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
        )
      }
      if (url.pathname === "/writeups/depth-child") {
        return new Response(
          article("DepthBudgetMarker IDOR child should not be crawled", "/writeups/depth-boundary"),
          { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
        )
      }
      if (url.pathname === "/writeups/depth-invalid-root") {
        return new Response(
          article("InvalidDepthMarker IDOR root", "/writeups/depth-invalid-1"),
          { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
        )
      }
      if (url.pathname === "/writeups/depth-invalid-1") {
        return new Response(
          article("InvalidDepthMarker IDOR first child", "/writeups/depth-invalid-2"),
          { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
        )
      }
      if (url.pathname === "/writeups/depth-invalid-2") {
        return new Response(
          article("InvalidDepthMarker IDOR second child", "/writeups/depth-invalid-3"),
          { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
        )
      }
      if (url.pathname === "/writeups/depth-invalid-3") {
        return new Response(
          article("InvalidDepthMarker IDOR over-budget page", "/writeups/depth-invalid-4"),
          { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
        )
      }
      return new Response("not found", { status: 404 })
    }) as typeof fetch,
    async () => {
      const source = {
        id: "learning-e2e-pipeline",
        name: "Isolated learning pipeline fixture",
        kind: "writeup" as const,
        seedUrls: ["https://research.example/writeups/pipeline-first"],
        hosts: ["research.example"],
        trust: 90,
      }

      const first = await syncResearchSource(source, { limit: 10, pages: 10, depth: 1 })
      expect(first.failed).toBe(0)
      expect(first.pages_crawled).toBe(2)
      expect(first.learned).toBe(2)

      const search = ReportKnowledge.search({ query: "PipelineE2EMarker", limit: 10 })
      expect(search).toHaveLength(2)
      expect(search.every((row) => row.source_kind === "external_report")).toBe(true)
      expect(search.every((row) => row.source_url?.startsWith("https://research.example/"))).toBe(true)

      const recommendations = ReportKnowledge.recommendations({
        signal: "PipelineE2EMarker",
        vulnerabilityClass: "idor",
        limit: 10,
      })
      expect(recommendations).toHaveLength(2)
      expect(recommendations.every((row) => row.metadata?.source_trust === 90)).toBe(true)

      const sessionID = "isolated-learning-pipeline-session"
      const activated = Learning.activateResearch(sessionID, {
        query: "PipelineE2EMarker",
        vulnerabilityClass: "idor",
        limit: 10,
      })
      expect(activated).toHaveLength(2)
      expect(Learning.researchFor(sessionID, 10).map((row) => row.id).sort()).toEqual(
        recommendations.map((row) => row.id).sort(),
      )

      const repeat = await syncResearchSource(source, { limit: 10, pages: 10, depth: 1 })
      expect(repeat.failed).toBe(0)
      expect(repeat.learned).toBe(0)
      expect(ReportKnowledge.search({ query: "PipelineE2EMarker", limit: 10 })).toHaveLength(2)

      const depthSource = {
        ...source,
        id: "learning-e2e-depth",
        seedUrls: ["https://research.example/writeups/depth-boundary"],
      }
      const bounded = await syncResearchSource(depthSource, { limit: 10, pages: 10, depth: 0 })
      expect(bounded.failed).toBe(0)
      expect(bounded.pages_crawled).toBe(1)
      expect(bounded.learned).toBe(1)
      expect(requested).not.toContain("https://research.example/writeups/depth-child")
      expect(ReportKnowledge.search({ query: "DepthBudgetMarker", limit: 10 })).toHaveLength(1)

      // Invalid numeric budgets must fall back to bounded defaults. NaN makes the depth comparison ineffective.
      const invalidBudgetSource = {
        ...source,
        id: "learning-e2e-invalid-budget",
        seedUrls: ["https://research.example/writeups/depth-invalid-root"],
      }
      const invalidBudget = await syncResearchSource(invalidBudgetSource, {
        limit: 10,
        pages: 10,
        depth: Number.NaN,
      })
      expect(invalidBudget.failed).toBe(0)
      expect(invalidBudget.pages_crawled).toBeGreaterThan(0)
      expect(requested).not.toContain("https://research.example/writeups/depth-invalid-3")
    },
  )
})
