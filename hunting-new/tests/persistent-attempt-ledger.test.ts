import { describe, expect, test } from "bun:test"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { initMission } from "../src/mission"
import { PersistentAttemptLedger } from "../src/persistent-attempt-ledger"

describe("persistent attempt ledger", () => {
  test("does not repeat variants after a restart", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cyberstrike-attempt-"))
    const target = "example.com"
    await initMission(root, target, [{ type: "host", value: target }])

    const first = await PersistentAttemptLedger.create(root, target, { maxAttempts: 20 })
    const a1 = await first.plan("hyp-1", "parameter", "baseline", "initial validation")
    expect(a1?.id).toBe("attempt-hyp-1-1")

    const second = await PersistentAttemptLedger.create(root, target, { maxAttempts: 20 })
    expect(second.list("hyp-1")).toHaveLength(1)
    expect(second.remaining("hyp-1")).toBe(19)

    const duplicate = await second.plan("hyp-1", "encoding", "baseline", "should be blocked")
    expect(duplicate).toBeUndefined()

    const a2 = await second.plan("hyp-1", "encoding", "mixed-encoding", "alternate validation")
    expect(a2?.id).toBe("attempt-hyp-1-2")
  })
})
