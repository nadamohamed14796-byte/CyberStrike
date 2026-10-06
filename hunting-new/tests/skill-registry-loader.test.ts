import { describe, expect, test } from "bun:test"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { loadSkillRegistry } from "../src/skill-registry-loader"

describe("external skill registry", () => {
  test("discovers local external skill roots without overwriting core skills", async () => {
    const root=await mkdtemp("/tmp/cyberstrike-registry-")
    const external=path.join(root,"external")
    const skillDir=path.join(external,"redteam","hunt-example")
    await mkdir(skillDir,{recursive:true})
    await writeFile(path.join(skillDir,"SKILL.md"),["---","name: hunt-example","description: Example external skill","---","","# Example","","API testing for an authorized target."].join("\n"))
    const previous=process.env.HUNT_EXTERNAL_SKILL_ROOTS
    process.env.HUNT_EXTERNAL_SKILL_ROOTS=external
    try{
      const registry=await loadSkillRegistry(root)
      const skill=registry.get("hunt-example")
      expect(skill?.source_path).toBe(path.join(skillDir,"SKILL.md"))
      expect(skill?.category).toBe("redteam")
      expect(skill?.triggers).toContain("hunt-example")
    }finally{
      if(previous===undefined)delete process.env.HUNT_EXTERNAL_SKILL_ROOTS
      else process.env.HUNT_EXTERNAL_SKILL_ROOTS=previous
      await rm(root,{recursive:true,force:true})
    }
  })
})