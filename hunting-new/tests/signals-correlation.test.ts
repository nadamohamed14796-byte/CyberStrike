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
