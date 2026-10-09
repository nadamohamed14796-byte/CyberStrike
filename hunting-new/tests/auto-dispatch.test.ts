import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { autoDispatchForTarget } from "../src/auto-dispatch"

describe("guarded auto dispatch", () => {
  test("does not execute unless explicitly enabled", async () => {
    const root=await mkdtemp(path.join(tmpdir(),"cyberstrike-auto-"))
    const previous=process.env.HUNTING_AUTO_EXECUTE
    delete process.env.HUNTING_AUTO_EXECUTE
    try {
      const result=await autoDispatchForTarget(root,"example.test")
      expect(result.enabled).toBe(false)
      expect(result.started).toBe(false)
    } finally {
      if(previous===undefined)delete process.env.HUNTING_AUTO_EXECUTE
      else process.env.HUNTING_AUTO_EXECUTE=previous
      await rm(root,{recursive:true,force:true})
    }
  })
})
