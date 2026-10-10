import { expect, test } from "bun:test"
import { signalsFromCorrelation } from "../src/signals"

test("fans shared parameters out into request-scoped account signals", () => {
  const signals = signalsFromCorrelation({
    target: "app.example",
    requests: [
      {
        id: "request-a",
        url: "https://app.example/api/profile?user_id=1",
        path: "/api/profile",
        method: "GET",
        credentialId: "credential-a",
        accountLabel: "account-a",
        observedAt: 1,
        source: "observed",
      },
      {
        id: "request-b",
        url: "https://app.example/api/profile?user_id=2",
        path: "/api/profile",
        method: "GET",
        credentialId: "credential-b",
        accountLabel: "account-b",
        observedAt: 2,
        source: "observed",
      },
    ],
    responses: [],
    jsAssets: [],
    functions: [],
    parameters: [{
      id: "parameter-user-id",
      name: "user_id",
      location: "query",
      endpoint: "/api/profile",
      requestIds: ["request-a", "request-b"],
      confidence: 0.9,
      sources: ["observed"],
    }],
    edges: [],
  })

  const parameterSignals = signals.filter(item => item.source === "correlation:parameter")
  expect(parameterSignals).toHaveLength(2)
  expect(parameterSignals.map(item => item.metadata?.requestId)).toEqual(["request-a", "request-b"])
  expect(parameterSignals.map(item => item.metadata?.accountLabel)).toEqual(["account-a", "account-b"])
  expect(parameterSignals.map(item => item.metadata?.credentialId)).toEqual(["credential-a", "credential-b"])
})

test("keeps distinct parameter identities for the same request and endpoint", () => {
  const signals = signalsFromCorrelation({
    target: "app.example",
    requests: [{
      id: "request-a",
      url: "https://app.example/api/profile?user_id=1&tenant_id=2",
      path: "/api/profile",
      method: "GET",
      credentialId: "credential-a",
      accountLabel: "account-a",
      observedAt: 1,
      source: "observed",
    }],
    responses: [],
    jsAssets: [],
    functions: [],
    parameters: [
      {
        id: "parameter-user-id",
        name: "user_id",
        location: "query",
        endpoint: "/api/profile",
        requestIds: ["request-a"],
        confidence: 0.9,
        sources: ["observed"],
      },
      {
        id: "parameter-tenant-id",
        name: "tenant_id",
        location: "query",
        endpoint: "/api/profile",
        requestIds: ["request-a"],
        confidence: 0.88,
        sources: ["observed"],
      },
    ],
    edges: [],
  })

  const parameterSignals = signals.filter(item => item.source === "correlation:parameter")
  expect(parameterSignals).toHaveLength(2)
  expect(parameterSignals.map(item => item.metadata?.parameterId)).toEqual([
    "parameter-user-id",
    "parameter-tenant-id",
  ])
  expect(parameterSignals.map(item => item.metadata?.name)).toEqual(["user_id", "tenant_id"])
})

test("handles requests without an explicit method during API correlation", () => {
  const signals = signalsFromCorrelation({
    target: "app.example",
    requests: [{
      id: "request-without-method",
      url: "https://app.example/api/profile",
      path: "/api/profile",
      observedAt: 1,
      source: "observed",
    }],
    responses: [],
    jsAssets: [],
    functions: [],
    edges: [],
  })

  expect(signals.length).toBeGreaterThan(0)
})


test("chooses the latest response by observation time, not array order", () => {
  const signals = signalsFromCorrelation({
    target: "app.example",
    requests: [{
      id: "request-a",
      url: "https://app.example/api/profile",
      path: "/api/profile",
      method: "GET",
      accountLabel: "account-a",
      observedAt: 1,
      source: "observed",
    }],
    responses: [
      { id: "response-latest", requestId: "request-a", status: 403, headers: {}, observedAt: 20 },
      { id: "response-old", requestId: "request-a", status: 200, headers: {}, observedAt: 10 },
    ],
    jsAssets: [],
    functions: [],
    edges: [],
  })

  const blocked = signals.filter(item => item.signal === "access_control_blocked")
  expect(blocked).toHaveLength(1)
  expect(blocked[0]?.metadata?.responseId).toBe("response-latest")
  expect(blocked[0]?.metadata?.status).toBe(403)
})
