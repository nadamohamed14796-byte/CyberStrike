import { describe, expect, test } from "bun:test"
import { parseExecutionResult, resolveExecutionResultCorrelation, verifiedEvidenceIds } from "../src/execution-result"

describe("execution result", () => {
  test("parses structured output", () => {
    const payload = {
      state: "confirmed",
      outcome: "clean",
      attempt_id: "att-1",
      request_id: "req-1",
      response_id: "res-1",
      result_summary: "Observed a reproducible difference",
      evidence: [{ id: "ev-1", kind: "response", summary: "response changed", observed: true, independent: true }],
      observations: ["response changed"],
    }
    const result = parseExecutionResult(JSON.stringify(payload), { state: "executed", outcome: "clean" })
    expect(result.state).toBe("confirmed")
    expect(result.attemptId).toBe("att-1")
    expect(result.requestId).toBe("req-1")
    expect(result.responseId).toBe("res-1")
    expect(result.evidence[0]?.kind).toBe("response")
    expect(result.observations).toEqual(["response changed"])
  })

  test("keeps fallback state for malformed structured output", () => {
    const result = parseExecutionResult("state: blocked\n{not-json}", { state: "inconclusive", outcome: "errored" })
    expect(result.state).toBe("blocked")
    expect(result.outcome).toBe("errored")
  })

  test("filters evidence references to the authoritative evidence set", () => {
    const result = parseExecutionResult(JSON.stringify({
      state: "executed",
      outcome: "clean",
      evidence: [
        { id: "ev-real", kind: "response", summary: "observed" },
        { id: "ev-fake", kind: "response", summary: "not persisted" },
      ],
    }), { state: "executed", outcome: "clean" })
    expect(verifiedEvidenceIds(result, new Set(["ev-real"]))).toEqual(["ev-real"])
  })
})

describe("structured report fields", () => {
  test("preserves root cause and reproduction text", () => {
    const result=parseExecutionResult(JSON.stringify({
      state:"confirmed",
      outcome:"clean",
      severity:"high",
      impact:"security impact",
      root_cause:"server authorization check is missing",
      steps_to_reproduce:"1. Authenticate as account A. 2. Request object B.",
      evidence:[],
      observations:[],
    }),{state:"inconclusive",outcome:"clean"})
    expect(result.rootCause).toBe("server authorization check is missing")
    expect(result.reproduction).toContain("Authenticate as account A")
  })
})


describe("execution result correlation", () => {
  const requests = [
    { id: "request-a", url: "https://example.test/api/a", path: "/api/a", accountLabel: "account-a" },
    { id: "request-b", url: "https://example.test/api/b", path: "/api/b", credentialId: "account-b" },
  ]
  const responses = [
    { id: "response-a", requestId: "request-a" },
    { id: "response-b", requestId: "request-b" },
  ]

  test("accepts a result whose request, response, endpoint and account agree", () => {
    expect(resolveExecutionResultCorrelation({
      expectedRequestId: "request-a",
      expectedResponseId: "response-a",
      endpoint: "/api/a",
      accountLabel: "account-a",
      executorRequestId: "request-a",
      structuredResponseId: "response-a",
      requests,
      responses,
    })).toEqual({ requestId: "request-a", responseId: "response-a", error: undefined })
  })

  test("rejects a response belonging to a different request", () => {
    const result = resolveExecutionResultCorrelation({
      expectedRequestId: "request-b",
      executorResponseId: "response-a",
      requests,
      responses,
    })
    expect(result.error).toContain("different request")
  })

  test("rejects unknown IDs, endpoint mismatches and cross-account evidence", () => {
    const unknown = resolveExecutionResultCorrelation({
      executorRequestId: "request-missing",
      requests,
      responses,
    })
    expect(unknown.error).toContain("unknown request")

    const endpoint = resolveExecutionResultCorrelation({
      expectedRequestId: "request-a",
      endpoint: "/api/other",
      requests,
      responses,
    })
    expect(endpoint.error).toContain("endpoint")

    const account = resolveExecutionResultCorrelation({
      expectedRequestId: "request-a",
      accountLabel: "account-b",
      requests,
      responses,
    })
    expect(account.error).toContain("account")
  })

  test("allows a response to establish its request when no request ID was returned", () => {
    expect(resolveExecutionResultCorrelation({
      executorResponseId: "response-b",
      endpoint: "/api/b",
      accountLabel: "account-b",
      requests,
      responses,
    })).toMatchObject({ requestId: "request-b", responseId: "response-b", error: undefined })
  })
})
