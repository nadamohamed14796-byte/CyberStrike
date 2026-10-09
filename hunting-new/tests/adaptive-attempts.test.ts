import { describe, expect, test } from "bun:test"
import { AttemptLedger } from "../src/adaptive-attempts"

describe("adaptive attempt ledger", () => {
  test("enforces distinct variants and 20-attempt ceiling", () => {
    const ledger = new AttemptLedger()
    expect(ledger.plan("h1", "parameter", "baseline", "initial signal")).toBeTruthy()
    expect(ledger.plan("h1", "parameter", "baseline", "duplicate")).toBeUndefined()
    for (let i = 2; i <= 20; i++) expect(ledger.plan("h1", "parameter", `variant-${i}`, "coverage")).toBeTruthy()
    expect(ledger.remaining("h1")).toBe(0)
  })
})
