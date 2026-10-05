import { describe, expect, test } from "bun:test"
import { createGraph, addRequest, addResponse, link } from "../src/correlation"
import { AccountContextRegistry } from "../src/account-context"
import { HypothesisStore } from "../src/hypotheses"
import { buildValidationContext } from "../src/correlated-validation"

describe("correlated validation", () => {
  test("keeps account, request, response and JS/function provenance", () => {
    const graph = createGraph()
    addRequest(graph, { id: "req-1", sessionId: "s1", method: "GET", url: "https://example.test/api/users/1", host: "example.test", observedAt: Date.now(), source: "observed", accountLabel: "account-A" })
    addResponse(graph, { id: "res-1", requestId: "req-1", status: 200, headers: {}, observedAt: Date.now() })
    graph.assets.set("js-1", { id: "js-1", url: "https://example.test/app.js", sha256: "hash", observedAt: Date.now() })
    graph.functions.set("fn-1", { id: "fn-1", name: "loadUser", assetId: "js-1" })
    link(graph, { from: "js-1", to: "req-1", kind: "observed-on", confidence: 1, evidence: "browser" })
    link(graph, { from: "fn-1", to: "req-1", kind: "triggered-by", confidence: 1, evidence: "browser" })
    const accounts = new AccountContextRegistry()
    accounts.register({ id: "a1", label: "account-A", authenticationState: "authenticated" })
    const h = new HypothesisStore().add({ title: "identifier validation", signal: "object_identifier_detected", target: "example.test", endpoint: "/api/users/1", confidence: .9, status: "pending", evidenceIds: [] })
    const context = buildValidationContext(graph, accounts, h)
    expect(context.accountLabels).toContain("account-A")
    expect(context.requestIds).toContain("req-1")
    expect(context.responseIds).toContain("res-1")
    expect(context.jsAssetIds).toContain("js-1")
    expect(context.functionIds).toContain("fn-1")
  })
})
