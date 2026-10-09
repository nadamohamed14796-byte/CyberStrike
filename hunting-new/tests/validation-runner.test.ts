import { describe, expect, test } from "bun:test"
import { HypothesisStore } from "../src/hypotheses"
import { createValidationPlan, createValidationRun } from "../src/validation-runner"

describe("validation runner", () => {
  test("bounds validation plans to twenty attempts", () => {
    const h = new HypothesisStore().add({ title: "test", signal: "test_signal", target: "example.test", confidence: .8, status: "pending", evidenceIds: [] })
    const plan = createValidationPlan(h, { maxAttempts: 50 })
    expect(plan.maxAttempts).toBe(20)
    expect(plan.strategies.length).toBe(20)
    expect(plan.variants.length).toBe(20)
  })
  test("creates an attempt ledger per hypothesis", () => {
    const h = new HypothesisStore().add({ title: "test", signal: "test_signal", target: "example.test", confidence: .8, status: "pending", evidenceIds: [] })
    const run = createValidationRun(h)
    expect(run.plan.hypothesisId).toBe(h.id)
    expect(run.ledger.remaining(h.id)).toBe(20)
  })
})


describe("reference strategy ranking", () => {
  test("uses writeup strategies only as a bounded ordering hint", () => {
    const hypothesis={id:"h-ref",target:"example.test",signal:"object_identifier_detected",title:"x",confidence:.9,status:"pending" as const,evidenceIds:[],createdAt:new Date().toISOString()}
    const result=createValidationPlan(hypothesis,{maxAttempts:20},undefined,undefined,"example.test",["workflow"])
    expect(result.variants[0].strategy).not.toBe("workflow")
    expect(result.variants.some(x=>x.strategy==="workflow")).toBe(true)
  })
})
