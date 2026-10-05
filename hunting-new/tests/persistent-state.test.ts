import { describe, expect, test } from "bun:test"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { upsertHypothesis, loadHypotheses } from "../src/hypothesis-store"
import { upsertChain, loadChains } from "../src/chain-store"
import { appendAttempt } from "../src/attempt-store"
import { loadHuntingState } from "../src/hunting-state"

describe("persistent hunting state", () => {
  test("survives a new store instance", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cyberstrike-"))
    const hypothesis = {
      id: "hyp-test", title: "test", signal: "idor", target: "example.com",
      confidence: .8, status: "pending" as const, evidenceIds: [], createdAt: new Date().toISOString(),
    }
    await upsertHypothesis(root, "example.com", hypothesis)
    expect((await loadHypotheses(root, "example.com")).hypotheses[0]?.id).toBe("hyp-test")
    const chain = { id: "chain-test", title: "test chain", status: "open" as const, hypothesisIds: ["hyp-test"], nodes: [], score: .8 }
    await upsertChain(root, "example.com", chain)
    const attempt = { id: "attempt-test", hypothesisId: "hyp-test", strategy: "parameter" as const, variant: "baseline", reason: "test", state: "executed" as const, evidenceIds: [], createdAt: Date.now() }
    await appendAttempt(root, "example.com", attempt)
    const state = await loadHuntingState(root, "example.com")
    expect(state.hypotheses.hypotheses).toHaveLength(1)
    expect(state.chains.chains).toHaveLength(1)
    expect(state.attempts.attempts).toHaveLength(1)
  })
})
