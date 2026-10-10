import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { describe, expect, test } from "bun:test"
import { loadHuntingRuntimeConfiguration, validateHuntingRuntimeRegistry } from "../src/runtime-config"
import { loadSkillRegistry } from "../src/skill-registry-loader"
import { buildSkillExecutionInvocation } from "../src/skill-execution-adapter"

describe("Hunting runtime configuration links", () => {
  test("uses repository defaults when HUNT_ROOT is an external state directory", async () => {
    const stateRoot=await mkdtemp(path.join(os.tmpdir(),"hunting-config-state-root-"))
    try{
      const config=await loadHuntingRuntimeConfiguration(stateRoot)
      expect(config.agentByRole).toEqual({
        "primary-hunter":"web-application",
        validator:"web-application",
        correlator:"proxy-analyzer",
        reviewer:"web-application",
      })
      expect(config.agentProfiles.authorization.agentId).toBe("web-application")
      expect(config.agentProfiles.javascript.agentId).toBe("proxy-analyzer")
      expect(config.researchSources.some(source=>source.enabled)).toBe(true)
      expect(config.referenceSources.some(source=>source.enabled)).toBe(true)
      expect(config.registry?.entrypoints?.session_ingest).toBe("packages/cyberstrike/src/server/routes/session.ts")
      expect(await validateHuntingRuntimeRegistry(stateRoot)).toEqual([])
    }finally{
      await rm(stateRoot,{recursive:true,force:true})
    }
  })

  test("an explicit scope override coexists with canonical policy and registry", async () => {
    const root=await mkdtemp(path.join(os.tmpdir(),"hunting-config-override-"))
    try{
      await mkdir(path.join(root,"config"),{recursive:true})
      await writeFile(path.join(root,"config","scope.yaml"),[
        "scope:","  mode: explicit","  unknown_target: block","  exclusions: []","  rules:",
        "    - value: custom-scope.example",
      ].join("\n"))
      const config=await loadHuntingRuntimeConfiguration(root)
      expect(config.scope.rules.map(rule=>rule.value)).toEqual(["custom-scope.example"])
      expect(config.agentProfiles.javascript.agentId).toBe("proxy-analyzer")
      expect(config.registry?.runtime).toBe("cyberstrike")
    }finally{
      await rm(root,{recursive:true,force:true})
    }
  })

  test("configured aliases and dependency edges resolve to registered source documents", async () => {
    const stateRoot=await mkdtemp(path.join(os.tmpdir(),"hunting-skill-state-root-"))
    try{
      const registry=await loadSkillRegistry(stateRoot)
      expect(registry.get("authorization")?.name).toBe("attack-idor-automation")
      expect(registry.get("endpoint_discovery")?.name).toBe("api-recon-and-docs")
      expect(registry.resolve(["authorization"]).map(skill=>skill.name)).toContain("api-recon-and-docs")
      const jsSkill=registry.get("javascript_intelligence")
      expect(jsSkill?.source_path).toBe(path.resolve(import.meta.dir,"..","skills","javascript_intelligence","SKILL.md"))
      expect(await Bun.file(jsSkill!.source_path!).exists()).toBe(true)
    }finally{
      await rm(stateRoot,{recursive:true,force:true})
    }
  })

  test("configured agent profiles flow into the actual agent invocation", async () => {
    const stateRoot=await mkdtemp(path.join(os.tmpdir(),"hunting-agent-profile-"))
    try{
      const config=await loadHuntingRuntimeConfiguration(stateRoot)
      const invocation=buildSkillExecutionInvocation({
        taskId:"profile-link-test",target:"authorized.example",role:"primary-hunter",
        primarySkill:"attack-idor-automation",recommendedAgent:"web-application",
        resolvedSkills:["attack-idor-automation"],strategyHints:["account-context"],
        signal:"object_identifier_detected",signalConfidence:0.9,reason:"profile propagation regression",
      },{
        configuredAgentByRole:config.agentByRole,
        configuredAgentProfiles:config.agentProfiles,
      })
      expect(invocation.agent).toBe("web-application")
      expect(invocation.prompt).toContain("configured_agent_profile: authorization")
      expect(invocation.prompt).toContain("require_authorized_test_accounts")
    }finally{
      await rm(stateRoot,{recursive:true,force:true})
    }
  })
})
