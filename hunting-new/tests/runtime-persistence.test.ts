import { describe, expect, test } from "bun:test"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { initMission } from "../src/mission"
import { checkpointPhase, resumeCheckpoint, transitionMissionAndCheckpoint } from "../src/runtime-persistence"

describe("runtime checkpoint lifecycle", () => {
  test("persists phase and resumes it", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cyberstrike-runtime-"))
    await initMission(root, "example.com", [{ type: "host", value: "example.com" }])

    const result = await transitionMissionAndCheckpoint(root, "example.com", "MAPPING", "mapping")
    expect(result.mission.state).toBe("MAPPING")
    expect(result.checkpoint.phase).toBe("mapping")
    expect((await resumeCheckpoint(root, "example.com"))?.phase).toBe("mapping")

    const checkpoint = await checkpointPhase(root, "example.com", "discovery")
    expect(checkpoint.phase).toBe("discovery")
    expect((await resumeCheckpoint(root, "example.com"))?.phase).toBe("discovery")
  })
})
