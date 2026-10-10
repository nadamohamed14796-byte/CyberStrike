import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { describe, expect, test } from "bun:test"
import { ingestCyberStrikeRequest } from "../src/cyberstrike-intake"
import { initMission } from "../src/mission"
import { targetDir, writeJson } from "../src/store"

const input = (target: string) => ({
  target,
  sessionId: "session-intake-test",
  request: { id: "request-1", method: "GET", url: "https://" + target, observedAt: Date.now() },
})

describe("session intake scope gate", () => {
  test("rejects intake for a target without an initialized mission before writing intelligence", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cyberstrike-intake-no-mission-"))
    const target = "no-mission.example"
    try {
      await expect(ingestCyberStrikeRequest(root, input(target))).rejects.toThrow("MISSION_NOT_INITIALIZED")
      expect(await Bun.file(path.join(targetDir(root, target), "intelligence", "target.json")).exists()).toBe(false)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test("rejects an out-of-scope request URL even when the mission target itself is in scope", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cyberstrike-intake-out-of-scope-request-"))
    const target = "intake.example"
    try {
      await initMission(root, target, [{ value: target }])
      const record = input(target)
      record.request.url = "https://outside.example/private"
      await expect(ingestCyberStrikeRequest(root, record)).rejects.toThrow("REQUEST_BLOCKED")
      expect(await Bun.file(path.join(targetDir(root, target), "intelligence", "target.json")).exists()).toBe(false)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test("rejects intake when the persisted mission no longer authorizes its target", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cyberstrike-intake-out-of-scope-"))
    const target = "intake.example"
    try {
      await initMission(root, target, [{ value: target }])
      const file = path.join(targetDir(root, target), "mission.json")
      const mission = await Bun.file(file).json()
      mission.scope = [{ value: "other.example" }]
      await writeJson(file, mission)
      await expect(ingestCyberStrikeRequest(root, input(target))).rejects.toThrow("MISSION_BLOCKED")
      expect(await Bun.file(path.join(targetDir(root, target), "intelligence", "target.json")).exists()).toBe(false)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
