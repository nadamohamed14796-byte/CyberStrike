import { describe, expect, test } from "bun:test"
import path from "path"
import { FpCheckTool, FpRecordTool } from "../../src/tool/fp"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

const ctx = { sessionID: "test", messageID: "", callID: "", agent: "build", abort: new AbortController().signal, metadata() {}, async ask() {} } as any

const shape = {
  target: "shop.example.com",
  functionality: "invoices",
  root: "missing object-level check",
  method: "GET",
  parameter: "id",
  cls: "idor",
  behavior: "other users invoice returned",
}

describe("false-positive tools", () => {
  test("a ruled-out lead is found on the next check and not recorded twice", async () => {
    const fixture = await tmpdir()
    await Instance.provide({
      directory: fixture.path,
      fn: async () => {
        const check = await FpCheckTool.init()
        const record = await FpRecordTool.init()
        const before = await check.execute(shape, ctx)
        expect(before.metadata.hit).toBe(false)

        const recorded = await record.execute(
          { ...shape, endpoint: "/api/invoices/{id}", reason: "returns the caller's own invoice", evidence: "two accounts, same body hash", confidence: "high" },
          ctx,
        )
        expect(recorded.output).toContain("recorded")

        const after = await check.execute(shape, ctx)
        expect(after.metadata.hit).toBe(true)
        expect(after.output).toContain("returns the caller's own invoice")

        const again = await record.execute(
          { ...shape, endpoint: "/api/invoices/{id}", reason: "changed", evidence: "changed", confidence: "low" },
          ctx,
        )
        expect(again.output).toContain("already recorded")
      },
    })
    expect(path.basename(fixture.path)).toBeTruthy()
  })
})
