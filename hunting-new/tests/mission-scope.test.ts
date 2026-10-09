import { describe, expect, test } from "bun:test"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { initMission } from "../src/mission"
import { checkScope } from "../src/scope"
import { loadConfiguredScope } from "../src/scope-config"

describe("scope policy enforcement", () => {
  test("loads and applies explicit host, protocol, port and exclusion rules", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cyberstrike-scope-"))
    try {
      await mkdir(path.join(root, "config"), { recursive: true })
      await writeFile(path.join(root, "config", "scope.yaml"), [
        "scope:",
        "  mode: explicit",
        "  unknown_target: block",
        "  exclusions:",
        "    - admin.example.com",
        "  rules:",
        "    - value: '*.example.com'",
        "      protocols: [https]",
        "      ports: [443]",
      ].join("\n"))
      const rules = await loadConfiguredScope(root)
      expect(checkScope("https://api.example.com", rules).allowed).toBe(true)
      expect(checkScope("http://api.example.com", rules).allowed).toBe(false)
      expect(checkScope("https://api.example.com:8443", rules).allowed).toBe(false)
      expect(checkScope("https://admin.example.com", rules).reason).toBe("explicit-exclusion")
      expect(checkScope("https://example.net", rules).allowed).toBe(false)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test("rejects malformed ports rather than converting a failed constraint to unrestricted access", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cyberstrike-scope-invalid-"))
    try {
      await mkdir(path.join(root, "config"), { recursive: true })
      await writeFile(path.join(root, "config", "scope.yaml"), [
        "scope:",
        "  mode: explicit",
        "  unknown_target: block",
        "  exclusions: []",
        "  rules:",
        "    - value: api.example.com",
        "      ports: [443, nope]",
      ].join("\n"))
      await expect(loadConfiguredScope(root)).rejects.toThrow("SCOPE_CONFIG_INVALID: ports")
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test("rejects direct mission initialization when no authorized scope rule exists", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cyberstrike-scope-empty-"))
    try {
      await expect(initMission(root, "example.com", [])).rejects.toThrow("MISSION_BLOCKED: out-of-scope")
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
