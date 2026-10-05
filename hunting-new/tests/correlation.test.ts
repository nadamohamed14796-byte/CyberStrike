import { describe, expect, test } from "bun:test"
import { addRequest, addResponse, createGraph, requestEvidence } from "../src/correlation"

describe("correlation graph", () => {
  test("keeps request/response provenance linked", () => {
    const graph = createGraph()
    addRequest(graph, { id: "r1", sessionId: "s1", method: "GET", url: "https://example.test/api", observedAt: 1, source: "browser" })
    addResponse(graph, { id: "p1", requestId: "r1", status: 200, headers: {}, observedAt: 2 })
    const evidence = requestEvidence(graph, "r1")
    expect(evidence.response?.status).toBe(200)
    expect(evidence.edges.some(e => e.kind === "responds-to")).toBe(true)
  })
})
