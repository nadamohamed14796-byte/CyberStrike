import { describe, expect, test } from "bun:test"
import { ChainBoard } from "../src/chain-board"

describe("chain board", () => {
  test("keeps evidence attached to a chain node", () => {
    const board = new ChainBoard()
    const chain = board.create("authorization validation", [{
      id: "hyp-1",
      title: "identifier signal requires validation",
      signal: "object_identifier_detected",
      target: "example.test",
      confidence: .8,
      status: "pending",
      evidenceIds: ["req-1"],
      createdAt: new Date().toISOString(),
    }])
    board.addEvidence(chain.id, "node_hyp-1", "res-1")
    expect(board.list()[0].nodes[0].evidenceIds).toContain("res-1")
  })
})
