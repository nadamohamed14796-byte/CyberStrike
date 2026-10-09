import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { recordLearning, loadLearning } from "../src/learning-store"

describe("learning persistence", () => {
  test("deduplicates repeated observations", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cyberstrike-"))
    try {
      const observation = { target: "example.test", signal: "x", skill: "s", strategy: "parameter", outcome: "false_positive" as const, confidence: .5, timestamp: new Date().toISOString() }
      await recordLearning(root, "example.test", observation)
      await recordLearning(root, "example.test", observation)
      const state = await loadLearning(root, "example.test")
      expect(state.observations).toHaveLength(1)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
