import { describe, expect, test } from "bun:test"
import { advance, fingerprint, gate, type State } from "../../src/finding/lifecycle"

const passing = [true, true, true, true, true, true, true, true, true, false]

describe("finding lifecycle", () => {
  test("moves one step at a time along the active path", () => {
    expect(advance("DISCOVERED", "CANDIDATE")).toEqual({ ok: true, state: "CANDIDATE" })
    expect(advance("DISCOVERED", "VERIFIED", true).ok).toBe(false)
    expect(advance("TRIAGED", "VALIDATING").ok).toBe(true)
  })

  test("VERIFIED needs the validation gate to pass", () => {
    expect(advance("VALIDATING", "VERIFIED")).toEqual({ ok: false, reason: "VERIFIED requires a passing validation gate" })
    expect(advance("VALIDATING", "VERIFIED", true)).toEqual({ ok: true, state: "VERIFIED" })
  })

  test("side states are reachable from any active step and are terminal", () => {
    expect(advance("CANDIDATE", "FALSE_POSITIVE")).toEqual({ ok: true, state: "FALSE_POSITIVE" })
    expect(advance("FALSE_POSITIVE", "CANDIDATE").ok).toBe(false)
    expect(advance("SUBMITTED", "DUPLICATE").ok).toBe(true)
  })

  test("the full path ends in SUBMITTED", () => {
    const path = ["CANDIDATE", "TRIAGED", "VALIDATING", "VERIFIED", "DEDUPED", "SEVERITY_ASSESSED", "REPORT_READY", "SUBMITTED"] as const
    const end = path.reduce((state, next) => {
      const result = advance(state, next, true)
      return result.ok ? result.state : state
    }, "DISCOVERED" as State)
    expect(end).toBe("SUBMITTED")
  })
})

describe("ten-question gate", () => {
  test("passes only when 1-9 are yes and 10 (duplicate or expected) is no", () => {
    expect(gate(passing)).toEqual({ pass: true, state: "VERIFIED" })
  })

  test("a single failing answer sends the finding to INCONCLUSIVE", () => {
    const result = gate([...passing.slice(0, 3), false, ...passing.slice(4)])
    expect(result).toEqual({ pass: false, state: "INCONCLUSIVE", failed: [4] })
  })

  test("question 10 answered yes means duplicate or expected", () => {
    const result = gate([...passing.slice(0, 9), true])
    expect(result.pass).toBe(false)
  })

  test("missing answers count as failures", () => {
    expect(gate(passing.slice(0, 8))).toMatchObject({ pass: false, failed: [9, 10] })
  })
})

describe("dedupe fingerprint", () => {
  const base = {
    target: "shop.example.com",
    functionality: "invoices",
    root: "missing object-level check",
    method: "GET",
    parameter: "id",
    cls: "idor",
    behavior: "other users invoice returned",
  }

  test("same root cause on different object IDs shares a key", () => {
    expect(fingerprint(base)).toBe(fingerprint({ ...base }))
  })

  test("different parameter or class gives a different key", () => {
    expect(fingerprint(base)).not.toBe(fingerprint({ ...base, parameter: "account" }))
    expect(fingerprint(base)).not.toBe(fingerprint({ ...base, cls: "authz" }))
  })

  test("case and extra spaces do not change the key", () => {
    expect(fingerprint(base)).toBe(fingerprint({ ...base, target: "  SHOP.example.com ", root: "Missing   object-level check" }))
  })
})
