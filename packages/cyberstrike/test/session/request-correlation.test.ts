import { describe, expect, test } from "bun:test"
import { RequestCorrelation } from "../../src/session/request-correlation"

describe("RequestCorrelation", () => {
  test("exports the canonical JS -> request -> artifact graph API", () => {
    expect(typeof RequestCorrelation.forJavascript).toBe("function")
    expect(typeof RequestCorrelation.forRequest).toBe("function")
  })
})
