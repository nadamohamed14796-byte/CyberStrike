import { describe, expect, test } from "bun:test"
import { validateHypothesis, hasCrossAccountEvidence } from "../src/validation-gate"

describe("validation gate", () => {
  test("blocks inference-only claims", () => {
    const result = validateHypothesis({
      hypothesisId: "hyp-1",
      inScope: true,
      attemptsExecuted: 1,
      distinctVariants: 1,
      expectedImpact: "high",
      evidence: [{ id: "inf-1", kind: "inference", summary: "looks suspicious" }],
    })
    expect(result.decision).toBe("blocked")
  })

  test("accepts supported in-scope validation", () => {
    const result = validateHypothesis({
      hypothesisId: "hyp-2",
      inScope: true,
      attemptsExecuted: 20,
      distinctVariants: 2,
      expectedImpact: "high",
      targetConfirmed: true,
      baselineObserved: true,
      behaviorChanged: true,
      reproducible: true,
      rootCauseSupported: true,
      impactObserved: true,
      authorizationContextVerified: true,
      evidence: [
        { id: "req-1", kind: "request", summary: "baseline request", observed: true },
        { id: "res-1", kind: "response", summary: "baseline response", observed: true, independent: true },
        { id: "res-2", kind: "response", summary: "changed response", observed: true, independent: true },
        { id: "fn-1", kind: "js", summary: "function correlation", observed: true },
      ],
    })
    expect(result.decision).toBe("eligible")
  })
})


describe("authorization evidence gate", () => {
  test("blocks account-sensitive validation without two account labels", () => {
    const result=validateHypothesis({
      hypothesisId:"h",
      inScope:true,
      attemptsExecuted:20,
      evidence:[
        {id:"r",kind:"request",summary:"GET /object/1",observed:true,independent:true,attemptId:"a1",requestId:"r1",accountLabel:"attacker"},
        {id:"s1",kind:"response",summary:"HTTP 200 body=A",observed:true,independent:true,attemptId:"a1",requestId:"r1",responseId:"s1",accountLabel:"attacker"},
        {id:"s2",kind:"response",summary:"HTTP 200 body=B",observed:true,independent:true,attemptId:"a2",requestId:"r2",responseId:"s2",accountLabel:"victim"},
      ],
      distinctVariants:2,
      expectedImpact:"high",
      targetConfirmed:true,
      baselineObserved:true,
      behaviorChanged:true,
      reproducible:true,
      rootCauseSupported:true,
      impactObserved:true,
      authorizationContextVerified:hasCrossAccountEvidence([
        {id:"r",kind:"request",summary:"GET /object/1",observed:true,independent:true,accountLabel:"attacker"},
        {id:"s",kind:"response",summary:"HTTP 200",observed:true,independent:true,accountLabel:"attacker"},
      ]),
    })
    expect(result.decision).toBe("blocked")
  })
})


describe("correlated behavior change", () => {
  test("requires distinct observed response behavior", () => {
    const base={kind:"response" as const,observed:true,independent:true,requestId:"req-1"}
    expect(hasBehaviorChange([
      {...base,responseId:"res-1",attemptId:"att-1",summary:"HTTP 200 application/json body_hash=a"},
      {...base,responseId:"res-2",attemptId:"att-2",summary:"HTTP 200 application/json body_hash=b"},
    ])).toBe(true)
    expect(hasBehaviorChange([
      {...base,responseId:"res-1",attemptId:"att-1",summary:"HTTP 200 application/json body_hash=a"},
    ])).toBe(false)
  })
})


describe("behavior change correlation", () => {
  test("does not treat different response ids as a behavior change when content is identical", async () => {
    const { hasBehaviorChange } = await import("../src/validation-gate")
    const evidence=[
      {id:"r1",kind:"response" as const,summary:"HTTP 200 body_hash=same",observed:true,requestId:"req-1",responseId:"res-1",attemptId:"a1"},
      {id:"r2",kind:"response" as const,summary:"HTTP 200 body_hash=same",observed:true,requestId:"req-1",responseId:"res-2",attemptId:"a2"},
    ]
    expect(hasBehaviorChange(evidence)).toBe(false)
  })

  test("accepts distinct observed response signatures across attempts", async () => {
    const { hasBehaviorChange } = await import("../src/validation-gate")
    const evidence=[
      {id:"r1",kind:"response" as const,summary:"HTTP 200 body_hash=one",observed:true,requestId:"req-1",responseId:"res-1",attemptId:"a1"},
      {id:"r2",kind:"response" as const,summary:"HTTP 200 body_hash=two",observed:true,requestId:"req-1",responseId:"res-2",attemptId:"a2"},
    ]
    expect(hasBehaviorChange(evidence)).toBe(true)
  })
})
