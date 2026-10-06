import { describe, expect, test } from "bun:test"
import { TargetWorkspace } from "../../src/tool/target-workspace"

describe("TargetWorkspace", () => {
  test("creates deterministic isolated target/session paths", () => {
    const a = TargetWorkspace.paths("https://Example.com/", "session_a")
    const b = TargetWorkspace.paths("https://example.com", "session_a")
    const c = TargetWorkspace.paths("https://example.com", "session_b")
    expect(a.root).toBe(b.root)
    expect(a.session).toBe(b.session)
    expect(a.session).not.toBe(c.session)
    expect(a.recon.startsWith(a.session)).toBe(true)
  })

  test("rejects path traversal in session ids", () => {
    expect(() => TargetWorkspace.paths("https://example.com", "../escape")).toThrow()
    expect(() => TargetWorkspace.paths("https://example.com", "a/b")).toThrow()
  })
})