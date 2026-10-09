import { afterAll, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

// test/preload.ts has already configured isolated XDG roots before importing
// Global. Do not change them here: Global.Path values are captured at import time.
// This scratch directory is only for project/session fixture paths and is removed
// after the test. The database remains in the disposable preload directory.
const root = await mkdtemp(path.join(os.tmpdir(), "cyberstrike-learning-isolation-"))

const [
  { Database },
  { ToolLearning },
  { ReferenceLearning },
  { ReportKnowledge },
  { Learning },
  { syncResearchSource },
  { ToolLearningTable },
  { SkillLearningTable, LearningSignalTable },
  { ProjectTable },
  { SessionTable },
] = await Promise.all([
  import("../../src/storage/db"),
  import("../../src/learning/tool-learning"),
  import("../../src/learning/reference"),
  import("../../src/learning/report-knowledge"),
  import("../../src/learning/learning"),
  import("../../src/research/ingest"),
  import("../../src/learning/tool-learning.sql"),
  import("../../src/learning/learning.sql"),
  import("../../src/project/project.sql"),
  import("../../src/session/session.sql"),
])

const originalFetch = globalThis.fetch

afterAll(async () => {
  globalThis.fetch = originalFetch
  await rm(root, { recursive: true, force: true })
})

test("learning scope, scores, limits, and duplicate ingestion remain consistent", async () => {
  const projectID = "learning-isolation-project"
  const sessionID = "learning-isolation-session"
  Database.use((db) => {
    db.insert(ProjectTable).values({ id: projectID, worktree: root, sandboxes: [] }).run()
    db.insert(SessionTable)
      .values({
        id: sessionID,
        project_id: projectID,
        slug: "learning-isolation",
        directory: root,
        title: "Learning isolation test",
        version: "test",
      })
      .run()
    db.insert(SessionTable)
      .values({
        id: "learning-private-target-session",
        project_id: projectID,
        slug: "private-target",
        directory: root,
        title: "Private target session",
        version: "test",
      })
      .run()
  })

  // A global event must not accidentally update the first session-scoped row.
  ToolLearning.observe({
    sessionID,
    tool: "BurpScan",
    signal: "IDOR",
    outcome: "useful",
    target: "https://session.example",
    evidence: "session-scoped positive observation",
  })
  ToolLearning.observe({
    tool: "BURPSCAN",
    signal: "IDOR",
    outcome: "rejected",
    target: "https://global.example",
    evidence: "global negative observation",
  })

  const tools = Database.use((db) =>
    db
      .select()
      .from(ToolLearningTable)
      .all()
      .filter((row) => row.tool === "burpscan" && row.signal === "access control"),
  )
  expect(tools).toHaveLength(2)
  expect(tools.find((row) => row.session_id === sessionID)?.successes).toBe(1)
  expect(tools.find((row) => row.session_id === sessionID)?.rejections).toBe(0)
  expect(tools.find((row) => row.session_id === null)?.successes).toBe(0)
  expect(tools.find((row) => row.session_id === null)?.rejections).toBe(1)
  expect(ToolLearning.score("BURPSCAN", "IDOR", sessionID)).toBe(100)

  const skill = {
    name: "learning-isolation-skill",
    description: "test fixture",
    location: path.join(root, "SKILL.md"),
    content: "# Learning isolation skill\n\n## IDOR\n- **Authorization checks**",
    category: "testing",
    tags: ["idor"],
  }
  ReferenceLearning.observeSkill(skill, sessionID)
  ReferenceLearning.observeSkill(skill)

  const skills = Database.use((db) =>
    db.select().from(SkillLearningTable).all().filter((row) => row.skill_name === skill.name),
  )
  expect(skills).toHaveLength(2)
  expect(skills.find((row) => row.session_id === sessionID)?.observations).toBe(1)
  expect(skills.find((row) => row.session_id === null)?.observations).toBe(1)
  expect(ReferenceLearning.score(skill.name, sessionID)).toBe(50)
  ReferenceLearning.recordOutcome(skill.name, "useful", sessionID, "controlled test evidence")
  expect(ReferenceLearning.score(skill.name, sessionID)).toBe(100)

  // Search limits are bounded even for negative or non-integer CLI/API input.
  for (const index of [1, 2, 3]) {
    const stored = ReportKnowledge.ingestExternalDetailed({
      title: "IDOR limit regression test " + index,
      severity: "unknown",
      vulnerabilityClass: "idor",
      sourceURL: "https://search.example/reports/" + index,
      lesson: "Verify server-side object authorization with two distinct test accounts.",
      sourceTrust: 90,
    })
    expect(stored).not.toBeNull()
  }
  expect(ReportKnowledge.search({ query: "IDOR", limit: -3 })).toHaveLength(0)
  expect(ReportKnowledge.search({ query: "IDOR", limit: 1.8 })).toHaveLength(1)

  const privateURL = "https://private-target.example/reports/idor"
  const privateFinding = ReportKnowledge.ingest({
    sessionID: "learning-private-target-session",
    title: "research:idor IDOR private target finding",
    vulnerabilityClass: "idor",
    severity: "high",
    sourceKind: "finding",
    sourceURL: privateURL,
    targetPattern: "private-target.example",
    lesson: "Private target-specific lesson; must not enter reusable public research context.",
    outcome: "confirmed",
    sourceTrust: 95,
  })
  expect(privateFinding).toBeTruthy()

  // Drive the real crawler/normalizer/deduper/persistence code with deterministic
  // HTTP fixtures. No live third-party service is contacted.
  const source = {
    id: "test-research",
    name: "Test research",
    kind: "writeup" as const,
    seedUrls: [
      "https://research.example/reports/idor-case",
      "https://research.example/reports/idor-fresh-case",
    ],
    hosts: ["research.example"],
    trust: 90,
  }
  const article =
    "<!doctype html><html><head><title>IDOR authorization research</title></head><body><main>" +
    "This public security report documents an insecure direct object reference in an account endpoint. " +
    "The application trusted a user supplied record identifier without checking whether the current account " +
    "was authorized to read the corresponding object. An attacker could access another user's data by changing " +
    "the object identifier in the request. The root cause was missing server-side authorization enforcement, " +
    "and the recommended fix is to verify object ownership for every protected operation. " +
    "A safe reproduction requires two controlled accounts and only data that the tester owns or is authorized to access. " +
    "The result should be validated independently and should not be treated as proof of a vulnerability in another target." +
    "</main></body></html>"
  const previous = ReportKnowledge.ingestExternalDetailed({
    title: "Existing IDOR report",
    severity: "unknown",
    vulnerabilityClass: "idor",
    sourceURL: source.seedUrls[0],
    lesson: "Existing lesson used to exercise URL deduplication.",
    sourceTrust: 90,
  })
  expect(previous?.created).toBe(true)

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    if (url.pathname === "/sitemap.xml") {
      return new Response("<urlset></urlset>", {
        status: 200,
        headers: { "content-type": "application/xml" },
      })
    }
    return new Response(article, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    })
  }) as typeof fetch

  try {
    const result = await syncResearchSource(source, { limit: 5, pages: 5, depth: 1 })
    expect(result.fetched).toBe(2)
    expect(result.learned).toBe(1)
    expect(result.skipped).toBe(1)
    expect(result.failed).toBe(0)

    // The new document is searchable, persisted as a learning signal, and exposed
    // through the same session research cache consumed when building prompts.
    const freshURL = source.seedUrls[1]
    expect(ReportKnowledge.search({ query: "IDOR", limit: 20 }).some((row) => row.source_url === freshURL)).toBe(true)
    const signals = Database.use((db) => db.select().from(LearningSignalTable).all())
    const researchSignals = signals.filter((row) => row.signal === "research:idor")
    expect(researchSignals).toHaveLength(1)
    expect(JSON.stringify(researchSignals[0]?.metadata?.research_recommendations)).not.toContain(privateURL)

    const recommendations = Learning.primeResearch(sessionID, 6, {
      query: "IDOR",
      vulnerabilityClass: "idor",
    })
    expect(recommendations.some((row) => row.source_url === freshURL)).toBe(true)
    expect(recommendations.some((row) => row.source_url === privateURL)).toBe(false)
    expect(Learning.researchFor(sessionID, 6).some((row) => row.source_url === freshURL)).toBe(true)
    expect(Learning.researchFor(sessionID, 6).some((row) => row.source_url === privateURL)).toBe(false)
  } finally {
    globalThis.fetch = originalFetch
  }
})
