import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { describe, expect, test } from "bun:test"
import { initMission, loadMission } from "../src/mission"
import { targetDir, writeJson } from "../src/store"
import { rememberTargetIntelligence } from "../src/target-intelligence"
import { NativeCyberStrikeExecutor } from "../src/native-cyberstrike-executor"
import type { AgentTaskExecutionContext } from "../src/multi-agent-runtime"

describe("scope enforcement boundaries", () => {
  test("mission initialization rejects a target not allowed by supplied scope", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cyberstrike-scope-init-"))
    try {
      await expect(initMission(root, "evil.example", [{ value: "allowed.example" }])).rejects.toThrow("MISSION_BLOCKED")
      expect(await Bun.file(path.join(targetDir(root, "evil.example"), "mission.json")).exists()).toBe(false)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test("native executor blocks a persisted mission whose scope no longer allows its target", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cyberstrike-scope-executor-"))
    const target = "scope-enforcement.example"
    try {
      await initMission(root, target, [{ value: target }])
      const missionPath = path.join(targetDir(root, target), "mission.json")
      const mission = await Bun.file(missionPath).json()
      mission.scope = [{ value: "other.example" }]
      await writeJson(missionPath, mission)

      const context = {
        taskId: "scope-test-task",
        target,
        primarySkill: "authorization",
        resolvedSkills: ["authorization"],
        strategyHints: [],
        signal: "object_identifier_detected",
        signalConfidence: 0.9,
        reason: "scope guard regression test",
      } as AgentTaskExecutionContext

      const result = await new NativeCyberStrikeExecutor({ root }).execute(context)
      expect(result.state).toBe("blocked")
      expect(result.resultSummary).toContain("Active scope re-check blocked execution")
      expect(result.resultText).toBe("scope_blocked")
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
  test("rejects different target strings that collide after storage slugging", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cyberstrike-scope-collision-"))
    try {
      expect(targetDir(root, "alpha.example")).toBe(targetDir(root, "alpha-example"))
      await initMission(root, "alpha.example", [{ value: "alpha.example" }])
      await expect(loadMission(root, "alpha-example")).rejects.toThrow("TARGET_STORAGE_COLLISION")
      await expect(initMission(root, "alpha-example", [{ value: "alpha-example" }])).rejects.toThrow("TARGET_STORAGE_COLLISION")
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test("native executor blocks an out-of-scope request URL even when target mission is in scope", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cyberstrike-scope-request-"))
    const target = "scope-target.example"
    try {
      await initMission(root, target, [{ value: target }])
      await rememberTargetIntelligence(root, target, {
        requests: [{
          id: "req-out-of-scope", sessionId: "session-test", method: "GET",
          url: "https://evil.example/private", observedAt: Date.now(), source: "observed",
        }],
      })
      const context = {
        taskId: "scope-request-test",
        target,
        requestId: "req-out-of-scope",
        endpoint: "/private",
        primarySkill: "authorization",
        resolvedSkills: ["authorization"],
        strategyHints: [],
        signal: "object_identifier_detected",
        signalConfidence: 0.9,
        reason: "scope guard request URL regression test",
      } as AgentTaskExecutionContext
      const result = await new NativeCyberStrikeExecutor({ root }).execute(context)
      expect(result.state).toBe("blocked")
      expect(result.resultSummary).toContain("https://evil.example/private")
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test("relative endpoints are checked against path-restricted scope rules", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cyberstrike-path-scope-"))
    const target = "path-scope.example"
    try {
      await initMission(root, target, [{ value: target, path: "/api/*" }])
      const context = {
        taskId: "path-scope-test",
        target,
        endpoint: "/admin",
        primarySkill: "authorization",
        resolvedSkills: ["authorization"],
        strategyHints: [],
        signal: "object_identifier_detected",
        signalConfidence: 0.9,
        reason: "relative endpoint path-scope regression test",
      } as AgentTaskExecutionContext
      const result = await new NativeCyberStrikeExecutor({ root }).execute(context)
      expect(result.state).toBe("blocked")
      expect(result.resultSummary).toContain("https://path-scope.example/admin")
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

})
