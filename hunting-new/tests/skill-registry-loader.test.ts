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

describe("external skill metadata", () => {
  test("loads dependencies, required signals, agent and validation metadata", async () => {
    const root=await mkdtemp("/tmp/cyberstrike-registry-meta-")
    const external=path.join(root,"external")
    const skillDir=path.join(external,"skills","meta-skill")
    await mkdir(skillDir,{recursive:true})
    await writeFile(path.join(skillDir,"SKILL.md"),[
      "---",
      "name: meta-skill",
      "description: metadata test",
      "required_signals: [graphql_detected]",
      "dependencies: [base-skill]",
      "validation_requirements: [request-response-evidence]",
      "agent: web-application",
      "confidence_threshold: 0.8",
      "maximum_parallel_tasks: 3",
      "---",
      "# Meta",
    ].join("\n"))
    const previous=process.env.HUNT_EXTERNAL_SKILL_ROOTS
    process.env.HUNT_EXTERNAL_SKILL_ROOTS=external
    try{
      const registry=await loadSkillRegistry(root)
      const skill=registry.get("meta-skill")
      expect(skill?.required_signals).toEqual(["graphql_detected"])
      expect(skill?.dependencies).toEqual(["base-skill"])
      expect(skill?.validation_requirements).toEqual(["request-response-evidence"])
      expect(skill?.agent).toBe("web-application")
      expect(skill?.confidence_threshold).toBe(0.8)
      expect(skill?.maximum_parallel_tasks).toBe(3)
    }finally{
      if(previous===undefined)delete process.env.HUNT_EXTERNAL_SKILL_ROOTS
      else process.env.HUNT_EXTERNAL_SKILL_ROOTS=previous
      await rm(root,{recursive:true,force:true})
    }
  })
})
