import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { loadTargetIntelligence, rememberTargetIntelligence } from "../src/target-intelligence"

describe("target intelligence persistence", () => {
  test("merges intelligence across sessions", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cyberstrike-"))
    try {
      await rememberTargetIntelligence(root, "example.test", {
        tags: ["js"],
        requests: [{ id: "req-1", sessionId: "s1", method: "GET", url: "https://example.test/api/users", observedAt: 1, source: "observed" }],
      })
      await rememberTargetIntelligence(root, "example.test", {
        tags: ["api"],
        requests: [{ id: "req-2", sessionId: "s2", method: "POST", url: "https://example.test/api/users", observedAt: 2, source: "observed" }],
      })
      const state = await loadTargetIntelligence(root, "example.test")
      expect(state.requests).toHaveLength(2)
      expect(state.tags).toEqual(["js", "api"])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
