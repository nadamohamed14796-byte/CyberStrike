import { describe, expect, test } from "bun:test"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { FalsePositiveIntelligence } from "../src/false-positive-intelligence"
import { loadFalsePositives, recordFalsePositive, hydrateFalsePositiveIntelligence } from "../src/false-positive-store"

describe("persistent false positive intelligence", () => {
  test("survives reload and preserves penalty context", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cyberstrike-fp-"))
    const intelligence = new FalsePositiveIntelligence()
    const record = intelligence.record({
      target: "example.com",
      signal: "idor",
      skill: "api-idor",
      strategy: "identifier",
      endpoint: "/api/users/1",
      reason: "same response after account swap",
      evidenceIds: ["ev-1"],
      confidence: .9,
    })

    await recordFalsePositive(root, "example.com", record)

    const state = await loadFalsePositives(root, "example.com")
    expect(state.records).toHaveLength(1)
    const restored = hydrateFalsePositiveIntelligence(state)
    expect(restored.isKnown({
      target: "example.com",
      signal: "idor",
      skill: "api-idor",
      strategy: "identifier",
      endpoint: "/api/users/1",
    })).toBe(true)
  })
})
