import { describe, expect, test } from "bun:test"
import { HypothesisStore } from "../src/hypotheses"
import { createValidationPlan, createValidationRun } from "../src/validation-runner"

describe("validation runner", () => {
  test("bounds validation plans to twenty attempts", () => {
    const h = new HypothesisStore().add({ title: "test", signal: "test_signal", target: "example.test", confidence: .8, status: "pending", evidenceIds: [] })
    const plan = createValidationPlan(h, { maxAttempts: 50 })
    expect(plan.maxAttempts).toBe(20)
    expect(plan.strategies.length).toBe(12)
  })
  test("creates an attempt ledger per hypothesis", () => {
    const h = new HypothesisStore().add({ title: "test", signal: "test_signal", target: "example.test", confidence: .8, status: "pending", evidenceIds: [] })
    const run = createValidationRun(h)
    expect(run.plan.hypothesisId).toBe(h.id)
    expect(run.ledger.remaining()).toBe(20)
  })
})
