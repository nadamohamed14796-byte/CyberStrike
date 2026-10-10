import { buildExecutionContract } from "./execution-result"
import type { AgentTaskExecutionContext } from "./multi-agent-runtime"
import type { ConfiguredAgentProfile } from "./runtime-config"

export interface SkillExecutionInvocation {
  target:string
  agent:string
  skills:string[]
  prompt:string
  requestId?:string
  responseId?:string
  attemptId?:string
  endpoint?:string
}

export interface SkillExecutionAdapterOptions {
  agentBySkill?:Record<string,string>
  agentByRole?:Record<string,string>
  configuredAgentByRole?:Record<string,string>
  configuredAgentProfiles?:Record<string,ConfiguredAgentProfile>
  defaultAgent?:string
}

const DEFAULT_ROLE_AGENTS:Record<string,string>={
  "primary-hunter":"web-application",
  validator:"web-application",
  correlator:"proxy-agent",
  reviewer:"general",
}

function selectConfiguredAgentProfile(
  context:AgentTaskExecutionContext,
  role:string,
  agent:string,
  profiles:Record<string,ConfiguredAgentProfile>|undefined,
):ConfiguredAgentProfile|undefined{
  if(!profiles)return undefined
  const taskText=(context.primarySkill+" "+context.signal+" "+context.strategyHints.join(" ")).toLowerCase()
  let preferred:string
  if(role==="validator")preferred="verifier"
  else if(role==="reviewer")preferred="reporter"
  else if(role==="correlator"||/(javascript|source.?map|function.?request)/.test(taskText))preferred="javascript"
  else if(/(idor|authoriz|tenant|access.?control|object.?identifier)/.test(taskText))preferred="authorization"
  else if(/(api|graphql|websocket|jwt|endpoint|parameter|waf|rate.?limit)/.test(taskText))preferred="api"
  else preferred="recon"
  const candidate=profiles[preferred]
  if(candidate?.agentId===agent)return candidate
  const sameAgent=Object.values(profiles).filter(profile=>profile.agentId===agent)
  if(!sameAgent.length)return undefined
  return sameAgent.find(profile=>profile.name===preferred)??sameAgent[0]
}

export function buildSkillExecutionInvocation(
  context:AgentTaskExecutionContext,
  options:SkillExecutionAdapterOptions={},
):SkillExecutionInvocation{
  const role=context.role ?? "primary-hunter"
  const agent=options.agentBySkill?.[context.primarySkill] ??
    options.agentByRole?.[role] ??
    process.env[`HUNT_AGENT_ROLE_${role.toUpperCase().replace(/-/g,"_")}`] ??
    context.recommendedAgent ??
    options.configuredAgentByRole?.[role] ??
    DEFAULT_ROLE_AGENTS[role] ??
    options.defaultAgent ??
    process.env.HUNT_DEFAULT_AGENT ??
    "web-application"

  const agentProfile=selectConfiguredAgentProfile(context,role,agent,options.configuredAgentProfiles)
  const profilePrompt=agentProfile?[
    "",
    "## Configured Agent Profile",
    `configured_agent_profile: ${agentProfile.name}`,
    `configured_agent_id: ${agentProfile.agentId}`,
    `configured_agent_runtime: ${agentProfile.runtime||"(unspecified)"}`,
    `configured_agent_role: ${agentProfile.role||"(unspecified)"}`,
    `configured_agent_purpose: ${agentProfile.purpose||"(unspecified)"}`,
    `configured_agent_inputs: ${agentProfile.inputs.join(", ")||"(none)"}`,
    `configured_agent_outputs: ${agentProfile.outputs.join(", ")||"(none)"}`,
    `configured_agent_constraints: ${agentProfile.constraints.join("; ")||"(none)"}`,
    "Follow the configured constraints and return the stated outputs.",
    "",
  ]:[]
  const prompt=[
    "Execute one authorized bug-bounty validation task.",
    "Stay within the supplied target and scope.",
    "Use non-destructive validation and preserve evidence.",
    "Load and follow the resolved CyberStrike skills.",
    "Do not modify skill files or learning data.",
    "Do not declare a vulnerability without sufficient evidence.",
    ...profilePrompt,
    "",
    `target: ${context.target}`,
    `role: ${role}`,
    `skill: ${context.primarySkill}`,
    `resolved_skills: ${context.resolvedSkills.join(", ")}`,
    `resolved_skill_paths: ${(context.resolvedSkillPaths ?? []).join(", ") || "(none)"}`,
    `reference_ids: ${(context.referenceIds ?? []).join(", ") || "(none)"}`,
    `reference_urls: ${(context.referenceUrls ?? []).join(", ") || "(none)"}`,
    `signal: ${context.signal}`,
    `confidence: ${context.signalConfidence}`,
    `endpoint: ${context.endpoint ?? "(none)"}`,
    `request_id: ${context.requestId ?? "(none)"}`,
    `response_id: ${context.responseId ?? "(none)"}`,
    `attempt_id: ${context.attemptId ?? "(none)"}`,
    `account_label: ${context.accountLabel ?? "(none)"}`,
    `js_asset_ids: ${(context.jsAssetIds ?? []).join(", ") || "(none)"}`,
    `function_ids: ${(context.functionIds ?? []).join(", ") || "(none)"}`,
    `strategy_hints: ${context.strategyHints.join(", ") || "(none)"}`,
    "",
    "reason:",
    context.reason,
    "",
    buildExecutionContract(),
  ].join("\n")

  return {
    target:context.target,
    agent,
    skills:[...context.resolvedSkills],
    prompt,
    requestId:context.requestId,
    responseId:context.responseId,
    attemptId:context.attemptId,
    endpoint:context.endpoint,
  }
}
