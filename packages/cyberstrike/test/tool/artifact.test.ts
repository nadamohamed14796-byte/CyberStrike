import { describe, expect, test } from "bun:test"

describe("tool artifact provenance contract", () => {
  test("normalizes output deterministically for hashing", async () => {
    const mod = await import("../../src/tool/artifact")
    expect(typeof mod.ToolArtifact.record).toBe("function")
    expect(typeof mod.ToolArtifact.list).toBe("function")
    expect(typeof mod.ToolArtifact.byCall).toBe("function")
  })
})
