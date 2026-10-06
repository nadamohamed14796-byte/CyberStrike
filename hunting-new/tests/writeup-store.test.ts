import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { ingestWriteup, loadWriteups, strategyHintsFromWriteups } from "../src/writeup-store"

describe("writeup ingestion", () => {
  test("stores bounded reference insights without turning them into evidence", async () => {
    const root=await mkdtemp(path.join(tmpdir(),"cyberstrike-writeup-"))
    try{
      const item=await ingestWriteup(root,{
        sourcePath:"/refs/idor.md",
        title:"IDOR notes",
        content:"IDOR/BOLA testing should compare accounts, identifiers, and authorization boundaries.",
      })
      expect(item.id.startsWith("writeup_")).toBe(true)
      expect(item.insights.some(x=>x.signal==="object_identifier_detected")).toBe(true)
      expect(strategyHintsFromWriteups(await loadWriteups(root),"object_identifier_detected")).toEqual(
        ["account-context","identifier","parameter"],
      )
    }finally{
      await rm(root,{recursive:true,force:true})
    }
  })
})
