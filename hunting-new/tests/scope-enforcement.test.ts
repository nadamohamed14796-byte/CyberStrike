import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { describe, expect, test } from "bun:test"
import { initMission, loadMission } from "../src/mission"
import { targetDir, writeJson } from "../src/store"
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

})
