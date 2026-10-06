import { describe, expect, test } from "bun:test"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { indexSkillReferences, loadReferences, markReferencesUsed, referencesForSkills } from "../src/reference-store"

describe("skill reference index", () => {
  test("indexes references and tracks usage without touching skills", async () => {
    const root=await mkdtemp(path.join(tmpdir(),"cyberstrike-ref-"))
    try{
      const skillDir=path.join(root,"skills","idor")
      await mkdir(skillDir,{recursive:true})
      const skillFile=path.join(skillDir,"SKILL.md")
      const original="# IDOR\n\nReference: https://portswigger.net/web-security/access-control/idor\nAnother: https://medium.com/example/research"
      await writeFile(skillFile,original)
      const state=await indexSkillReferences(root,[{name:"idor",source_path:skillFile}])
      expect(state.references.length).toBe(2)
      expect((await referencesForSkills(root,["idor"],1)).length).toBe(1)
      const id=state.references[0].id
      await markReferencesUsed(root,[id,id])
      const stored=await loadReferences(root)
      expect(stored.references.find(x=>x.id===id)?.useCount).toBe(2)
      expect(await Bun.file(skillFile).text()).toBe(original)
    }finally{
      await rm(root,{recursive:true,force:true})
    }
  })
})
