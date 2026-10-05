import { describe, expect, test } from "bun:test"
import { createGraph, requestEvidence } from "../src/correlation"
import { ingestObservation } from "../src/intake"

describe("network intake", () => {
  test("attaches observed request and response to the same evidence chain", () => {
    const graph = createGraph()
    ingestObservation(graph, {
      sessionId: "browser-1",
      request: { id: "req-1", method: "POST", url: "https://example.test/api/resource", accountLabel: "user-A" },
      response: { id: "res-1", status: 200 },
      jsAssetIds: ["asset-1"],
      functionIds: ["fn-1"],
    })
    const evidence = requestEvidence(graph, "req-1")
    expect(evidence.request.accountLabel).toBe("user-A")
    expect(evidence.response?.status).toBe(200)
    expect(evidence.assets.map(x => x.id)).toContain("asset-1")
    expect(evidence.functions.map(x => x.id)).toContain("fn-1")
  })
})
