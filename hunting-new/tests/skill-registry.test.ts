import { describe, expect, test } from "bun:test"
import { SkillRegistry, type SkillMetadata } from "../src/skill-registry"

const skill=(name:string,dependencies:string[]=[]):SkillMetadata=>({
  name,category:"test",description:name,triggers:[name],required_context:[],
  dependencies,risk_level:"low",scope_requirements:[],validation_requirements:[],
  confidence_threshold:0.5,maximum_parallel_tasks:1,
})

describe("skill registry graph",()=>{
  test("deduplicates skills and merges dependency metadata",()=>{
    const registry=new SkillRegistry([
      {...skill("child",["base"]),triggers:["child"]},
      {...skill("child",["base","extra"]),triggers:["other"]},
      skill("base"),skill("extra"),
    ])
    expect(registry.list().filter(x=>x.name==="child")).toHaveLength(1)
    expect(registry.get("child")?.dependencies).toEqual(["base","extra"])
    expect(registry.resolve(["child"]).map(x=>x.name)).toEqual(["base","extra","child"])
  })
  test("reports missing and cyclic dependencies",()=>{
    const missing=new SkillRegistry([skill("a",["missing"])])
    expect(missing.validateDependencies()[0]).toContain("missing dependency")
    const cyclic=new SkillRegistry([skill("a",["b"]),skill("b",["a"])])
    expect(cyclic.validateDependencies().some(x=>x.includes("cyclic skill dependency"))).toBe(true)
  })
})


describe("skill resolution failures", () => {
  test("fails closed when a requested primary skill is missing", () => {
    const registry=new SkillRegistry([{
      name:"known",
      category:"web",
      description:"known",
      triggers:["known"],
      required_context:["authorized-scope"],
      dependencies:[],
      risk_level:"medium",
      scope_requirements:["authorized-scope"],
      validation_requirements:["evidence"],
      confidence_threshold:.5,
      maximum_parallel_tasks:1,
    }])
    expect(() => registry.resolve(["missing"])).toThrow("unknown skill: missing")
  })
})
