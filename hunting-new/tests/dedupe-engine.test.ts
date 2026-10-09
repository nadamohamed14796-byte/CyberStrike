import { describe, expect, test } from "bun:test"
import { FalsePositiveIntelligence } from "../src/false-positive-intelligence"
import { dedupeDecision, shouldRecheckAfterNewEvidence } from "../src/dedupe-engine"

describe("dedupe engine", () => {
  test("skips an exact known false-positive context", () => {
    const fp = new FalsePositiveIntelligence()
    const context = { target: "example.com", signal: "x", skill: "s", strategy: "parameter", endpoint: "/api", evidenceIds: ["e1"] }
    fp.record({ ...context, reason: "no impact", confidence: .9 })
    expect(dedupeDecision(fp, context).action).toBe("skip")
  })

  test("rechecks when genuinely new evidence appears", () => {
    const fp = new FalsePositiveIntelligence()
    const context = { target: "example.com", signal: "x", skill: "s", strategy: "parameter", endpoint: "/api", evidenceIds: ["e1"] }
    fp.record({ ...context, reason: "no impact", confidence: .9 })
    expect(shouldRecheckAfterNewEvidence(fp, { ...context, evidenceIds: ["e1", "e2"] })).toBe(true)
  })
})
