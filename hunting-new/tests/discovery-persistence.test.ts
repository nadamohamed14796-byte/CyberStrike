import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { createGraph } from "../src/correlation"
import { persistDiscovery } from "../src/discovery-persistence"
import { loadTargetIntelligence } from "../src/target-intelligence"

describe("discovery persistence", () => {
  test("persists JS assets and discovered requests", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cyberstrike-"))
    try {
      await persistDiscovery(root, {
        target: "example.test",
        graph: createGraph(),
        assets: [{ js_asset_id: "asset-1", url: "https://example.test/app.js", content_hash: "h1", size: 10, discovered_at: new Date().toISOString(), endpoints: [], methods: [], parameters: [], headers: [], framework: [], build_system: [], graphql_operations: [], websockets: [], security_leads: [] }],
        requests: [{ endpoint: "https://example.test/api/users", method: "GET", confidence: .8, source: "javascript" }],
        tags: ["javascript"],
      })
      const state = await loadTargetIntelligence(root, "example.test")
      expect(state.jsAssets.some(x => x.id === "asset-1")).toBe(true)
      expect(state.requests.some(x => x.url.includes("/api/users"))).toBe(true)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
