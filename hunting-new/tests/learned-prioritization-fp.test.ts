import { describe, expect, test } from "bun:test"
import { LearningEngine } from "../src/learning-engine"
import { prioritizeSkills } from "../src/learned-prioritization"
import { FalsePositiveIntelligence } from "../src/false-positive-intelligence"

describe("learned prioritization with false positives", () => {
  test("down-ranks repeated false positives without mutating rules", () => {
    const learning = new LearningEngine()
    const fp = new FalsePositiveIntelligence()
    const rules = [
      { name: "idor", confidence_threshold: .7, required_signals: ["idor"], priority: 10 },
      { name: "authz", confidence_threshold: .7, required_signals: ["idor"], priority: 5 },
    ]
    fp.record({ target: "example.com", signal: "idor", skill: "idor", strategy: "identifier", endpoint: "/api", reason: "false positive", confidence: .9 })
    const result = prioritizeSkills(rules, learning, "example.com", "idor", fp)
    expect(result[0].skill).toBe("idor")
    expect(result[0].adjustedPriority).toBeLessThan(10)
    expect(rules[0].priority).toBe(10)
  })
})
