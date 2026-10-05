import { describe, expect, test } from "bun:test"
import { HypothesisStore } from "../src/hypotheses"

describe("hypothesis generation", () => {
  test("deduplicates the same signal/target/endpoint", () => {
    const store = new HypothesisStore()
    const signal = {
      signal: "object_identifier_detected",
      source: "javascript",
      confidence: .8,
      target: "example.test",
      endpoint: "/api/users",
      timestamp: new Date().toISOString(),
    }
    const a = store.fromSignal(signal)
    const b = store.fromSignal(signal)
    expect(a.id).toBe(b.id)
    expect(store.list()).toHaveLength(1)
  })
})
