import { describe, expect, test } from "bun:test"
import { TargetMemory } from "../../src/session/target-memory"

describe("TargetMemory discovery promotion", () => {
  test("exposes discovery promotion API", () => {
    expect(typeof TargetMemory.rememberDiscovery).toBe("function")
  })
})
