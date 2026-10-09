import { describe, expect, test } from "bun:test"
import { LearningEngine } from "../src/learning-engine"
import { prioritizeSkills } from "../src/learned-prioritization"

describe("learned prioritization", () => {
  test("adjusts priority without mutating skill definitions", () => {
    const engine = new LearningEngine()
    engine.record({ target: "example.test", signal: "x", skill: "idor", strategy: "account-context", outcome: "confirmed", confidence: .9 })
    const rules = [{ name: "idor", confidence_threshold: .7, required_signals: ["x"], priority: 1 }]
    const before = JSON.stringify(rules)
    const result = prioritizeSkills(rules, engine, "example.test", "x")
    expect(JSON.stringify(rules)).toBe(before)
    expect(result[0].adjustedPriority).toBeGreaterThan(1)
  })
})
