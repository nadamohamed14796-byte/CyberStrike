import { describe, expect, test } from "bun:test"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { initMission } from "../src/mission"
import { checkScope, loadScopeRules } from "../src/scope"

describe("configured scope", () => {
  test("loads host, protocol, port and exclusion rules", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cyberstrike-scope-"))
    try {
      await mkdir(path.join(root, "config"), { recursive: true })
      await writeFile(path.join(root, "config", "scope.yaml"), [
        "scope:",
        "  mode: explicit",
        "  unknown_target: block",
        "  exclusions:",
        "    - value: admin.example.com",
        "  rules:",
        "    - value: '*.example.com'",
        "      protocols: [https]",
        "      ports: [443]",
      ].join("\n"))

      const rules = await loadScopeRules(root)
      expect(checkScope("https://api.example.com", rules).allowed).toBe(true)
      expect(checkScope("http://api.example.com", rules).allowed).toBe(false)
      expect(checkScope("https://api.example.com:8443", rules).allowed).toBe(false)
      expect(checkScope("https://admin.example.com", rules)).toMatchObject({
        allowed: false,
        reason: "explicit-exclusion",
      })
      expect(checkScope("https://example.net", rules).allowed).toBe(false)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test("keeps an empty explicit scope closed and blocks mission initialization", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cyberstrike-scope-empty-"))
    try {
      await mkdir(path.join(root, "config"), { recursive: true })
      await writeFile(path.join(root, "config", "scope.yaml"), [
        "scope:",
        "  mode: explicit",
        "  unknown_target: block",
        "  exclusions: []",
        "  rules: []",
      ].join("\n"))

      const rules = await loadScopeRules(root)
      expect(rules).toEqual([])
      expect(checkScope("example.com", rules).allowed).toBe(false)
      await expect(initMission(root, "example.com", rules)).rejects.toThrow("MISSION_BLOCKED: out-of-scope")
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
