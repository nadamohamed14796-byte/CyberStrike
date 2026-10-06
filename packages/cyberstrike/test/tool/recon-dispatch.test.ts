import { describe, expect, test } from "bun:test"
import { ReconDispatch } from "../../src/tool/recon-dispatch"

describe("ReconDispatch", () => {
  test("exposes an anti-loop planner", () => {
    expect(typeof ReconDispatch.next).toBe("function")
  })
})
