import { describe, expect, test } from "bun:test"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { loadHuntingRuntimeConfiguration, validateHuntingRuntimeRegistry } from "../src/runtime-config"
import { checkConfiguredScope, checkConfiguredTargetScope } from "../src/scope"

describe("runtime configuration integration", () => {
  test("loads policies, scope rules, role mapping and research sources", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hunting-runtime-config-"))
    try {
      await mkdir(path.join(root, "config"), { recursive: true })
      await writeFile(path.join(root, "config", "scope.yaml"), [
        "scope:", "  mode: explicit", "  unknown_target: block", "  exclusions: []",
        "  rules:", "    - value: allowed.example", "      path: /api/*",
        "      protocols: [https]", "      ports: [443]",
      ].join("\n"))
      await writeFile(path.join(root, "config", "policies.yaml"), [
        "mission:", "  require_provenance: true", "validation:", "  default_attempt_budget: 99",
        "safety:", "  require_scope_gate: true", "  require_authorization_gate: true",
        "  require_rate_limit_gate: true", "  require_risk_gate: true", "  never_store_secrets: true",
        "learning:", "  rewrite_skills: false", "context:", "  max_task_records: 12",
      ].join("\n"))
      await writeFile(path.join(root, "config", "agents.yaml"), [
        "agents:", "  recon:", "    agent_id: explore", "    runtime: cyberstrike",
        "  javascript:", "    agent_id: proxy-analyzer", "    runtime: cyberstrike",
        "  verifier:", "    agent_id: general", "    runtime: cyberstrike",
        "  reporter:", "    agent_id: general", "    runtime: cyberstrike",
      ].join("\n"))
      await writeFile(path.join(root, "config", "sources.yaml"), [
        "sources:", "  - name: test-feed", "    type: RSS",
        "    url: https://example.test/feed.xml", "    enabled: true",
      ].join("\n"))
      await writeFile(path.join(root, "config", "reference-sources.yaml"), [
        "sources:", "  - name: test-reference", "    url: https://example.test/reference",
      ].join("\n"))
      const config = await loadHuntingRuntimeConfiguration(root)
      expect(config.policy.defaultAttemptBudget).toBe(20)
      expect(config.policy.maxTaskRecords).toBe(12)
      expect(config.scope.rules).toEqual([{
        value: "allowed.example", path: "/api/*", protocols: ["https"], ports: [443], exclude: false,
      }])
      expect(config.agentByRole["primary-hunter"]).toBe("explore")
      expect(config.agentByRole.correlator).toBe("proxy-analyzer")
      expect(config.researchSources.some(source => source.name === "test-feed" && source.enabled)).toBe(true)
      expect(config.referenceSources.some(source => source.name === "test-reference")).toBe(true)
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  test("enforces configured allow rules and exclusions alongside mission scope", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hunting-runtime-scope-"))
    try {
      await mkdir(path.join(root, "config"), { recursive: true })
      await writeFile(path.join(root, "config", "scope.yaml"), [
        "scope:", "  mode: explicit", "  unknown_target: block", "  exclusions:",
        "    - value: allowed.example", "      path: /admin/*", "  rules:",
        "    - value: allowed.example", "      path: /api/*",
      ].join("\n"))
      const missionScope = [{ value: "allowed.example" }]
      expect((await checkConfiguredTargetScope(root, "allowed.example", missionScope)).allowed).toBe(true)
      expect((await checkConfiguredScope(root, "https://allowed.example/api/users", missionScope)).allowed).toBe(true)
      expect((await checkConfiguredScope(root, "https://allowed.example/admin/users", missionScope)).allowed).toBe(false)
      expect((await checkConfiguredScope(root, "https://evil.example/api/users", missionScope)).allowed).toBe(false)
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  test("runtime registry references resolve to real files and package version", async () => {
    const root = path.resolve(import.meta.dir, "..")
    expect(await validateHuntingRuntimeRegistry(root)).toEqual([])
  })
})
