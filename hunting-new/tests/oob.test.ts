import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { upsertOob, recordOobObservation, correlateOob, confirmOob, loadOob } from "../src/oob"

describe("persistent OOB tracking", () => {
  test("keeps callback lifecycle and evidence", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cyberstrike-oob-"))
    try {
      await upsertOob(root, "example.test", {
        id: "oob-1", callbackId: "cb-1", target: "example.test", hypothesisId: "hyp-1",
        attemptId: "att-1", state: "generated", generatedAt: "2026-10-06T00:00:00.000Z", evidenceIds: []
      })
      await recordOobObservation(root, "example.test", "cb-1", "2026-10-06T00:01:00.000Z", ["ev-1"])
      await correlateOob(root, "example.test", "cb-1", ["ev-2"])
      const confirmed = await confirmOob(root, "example.test", "cb-1", ["ev-3"])
      expect(confirmed?.state).toBe("confirmed")
      expect(confirmed?.evidenceIds).toEqual(["ev-1", "ev-2", "ev-3"])
      const state = await loadOob(root, "example.test")
      expect(state.records[0]?.state).toBe("confirmed")
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})