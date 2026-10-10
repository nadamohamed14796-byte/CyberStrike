import { describe, expect, test } from "bun:test"
import { buildSkillExecutionInvocation } from "../src/skill-execution-adapter"

describe("skill execution routing", () => {
  test("maps correlator tasks to the proxy agent by default", () => {
    const result = buildSkillExecutionInvocation({
      taskId: "task-1", target: "example.test", role: "correlator", primarySkill: "proxy-analyzer",
      resolvedSkills: ["proxy-analyzer"], strategyHints: ["api-surface"], signal: "javascript_function_request_correlation",
      signalConfidence: 0.9, reason: "correlated request",
    })
    expect(result.agent).toBe("proxy-agent")
  })

  test("explicit skill mapping wins over role mapping", () => {
    const result = buildSkillExecutionInvocation({
      taskId: "task-2", target: "example.test", role: "correlator", primarySkill: "proxy-analyzer",
      resolvedSkills: ["proxy-analyzer"], strategyHints: [], signal: "api", signalConfidence: 0.9, reason: "api signal",
    }, { agentBySkill: { "proxy-analyzer": "custom-agent" } })
    expect(result.agent).toBe("custom-agent")
  })
})

describe("configured skill agents", () => {
  test("uses the skill-configured agent after explicit overrides are absent", () => {
    const result = buildSkillExecutionInvocation({
      taskId: "task-3", target: "example.test", role: "primary-hunter", primarySkill: "authorization",
      recommendedAgent: "web-application", resolvedSkills: ["authorization"], strategyHints: [],
      signal: "object_identifier_detected", signalConfidence: 0.9, reason: "configured skill agent",
    })
    expect(result.agent).toBe("web-application")
  })

  test("explicit role mapping takes precedence over the skill recommendation", () => {
    const result = buildSkillExecutionInvocation({
      taskId: "task-4", target: "example.test", role: "primary-hunter", primarySkill: "authorization",
      recommendedAgent: "configured-agent", resolvedSkills: ["authorization"], strategyHints: [],
      signal: "object_identifier_detected", signalConfidence: 0.9, reason: "override precedence",
    }, { agentByRole: { "primary-hunter": "role-agent" } })
    expect(result.agent).toBe("role-agent")
  })
})


describe("reference context", () => {
  test("passes indexed reference ids and URLs to the execution prompt", () => {
    const result=buildSkillExecutionInvocation({
      taskId:"task-ref",target:"example.test",role:"primary-hunter",primarySkill:"idor",
      resolvedSkills:["idor"],strategyHints:[],signal:"object_identifier_detected",
      signalConfidence:.9,reason:"reference-aware validation",
      referenceIds:["ref-1"],referenceUrls:["https://portswigger.net/web-security/access-control"],
    })
    expect(result.prompt).toContain("reference_ids: ref-1")
    expect(result.prompt).toContain("reference_urls: https://portswigger.net/web-security/access-control")
  })
})

describe("configured agent profile propagation", () => {
  test("passes configured purpose, inputs, outputs, and constraints to the selected agent prompt", () => {
    const result=buildSkillExecutionInvocation({
      taskId:"task-agent-profile",target:"example.test",role:"primary-hunter",
      primarySkill:"attack-idor-automation",recommendedAgent:"web-application",
      resolvedSkills:["attack-idor-automation"],strategyHints:[],
      signal:"object_identifier_detected",signalConfidence:0.9,reason:"profile routing test",
    },{
      configuredAgentProfiles:{
        authorization:{
          name:"authorization",agentId:"web-application",runtime:"cyberstrike",
          role:"authorization-analysis",
          purpose:"Verify object-level and tenant-boundary authorization.",
          inputs:["identity_and_role_context","object_relationships"],
          outputs:["authorization_test_results"],
          constraints:["require_authorized_test_accounts","preserve_evidence_provenance"],
        },
      },
    })
    expect(result.agent).toBe("web-application")
    expect(result.prompt).toContain("configured_agent_profile: authorization")
    expect(result.prompt).toContain("configured_agent_purpose: Verify object-level and tenant-boundary authorization.")
    expect(result.prompt).toContain("configured_agent_inputs: identity_and_role_context, object_relationships")
    expect(result.prompt).toContain("configured_agent_outputs: authorization_test_results")
    expect(result.prompt).toContain("configured_agent_constraints: require_authorized_test_accounts; preserve_evidence_provenance")
  })
})
