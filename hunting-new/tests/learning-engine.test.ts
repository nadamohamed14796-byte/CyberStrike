import { describe, expect, test } from "bun:test"
import { LearningEngine } from "../src/learning-engine"

describe("learning engine", () => {
  test("prioritizes useful strategies and penalizes false positives", () => {
    const engine = new LearningEngine()
    engine.record({ target: "example.test", signal: "object_identifier_detected", skill: "idor", strategy: "account-context", outcome: "confirmed", confidence: .9 })
    engine.record({ target: "example.test", signal: "object_identifier_detected", skill: "idor", strategy: "parameter", outcome: "false_positive", confidence: .7 })
    const scores = engine.score("example.test")
    expect(scores[0].key).toContain("account-context")
    expect(scores[0].confirmed).toBe(1)
  })
})


describe("confidence weighting", () => {
  test("lower-confidence observations contribute less to utility", () => {
    const high=new LearningEngine()
    high.record({target:"example.test",signal:"x",skill:"s",strategy:"high",outcome:"confirmed",confidence:1})
    high.record({target:"example.test",signal:"x",skill:"s",strategy:"high",outcome:"false_positive",confidence:0.1})
    const low=new LearningEngine()
    low.record({target:"example.test",signal:"x",skill:"s",strategy:"high",outcome:"confirmed",confidence:0.1})
    low.record({target:"example.test",signal:"x",skill:"s",strategy:"high",outcome:"false_positive",confidence:1})
    expect(high.score("example.test")[0].utility).toBeGreaterThan(low.score("example.test")[0].utility)
  })
})
