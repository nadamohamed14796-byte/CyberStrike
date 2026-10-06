import { buildExecutionContract } from "./execution-result"
import type { AgentTaskExecutionContext } from "./multi-agent-runtime"

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
  defaultAgent?:string
}

const DEFAULT_ROLE_AGENTS:Record<string,string>={
  "primary-hunter":"web-application",
  validator:"web-application",
  correlator:"proxy-agent",
  reviewer:"general",
}

export function buildSkillExecutionInvocation(
  context:AgentTaskExecutionContext,
  options:SkillExecutionAdapterOptions={},
):SkillExecutionInvocation{
  const role=context.role ?? "primary-hunter"
  const agent=options.agentBySkill?.[context.primarySkill] ??
    options.agentByRole?.[role] ??
    process.env[`HUNT_AGENT_ROLE_${role.toUpperCase().replace(/-/g,"_")}`] ??
    DEFAULT_ROLE_AGENTS[role] ??
    options.defaultAgent ??
    process.env.HUNT_DEFAULT_AGENT ??
    "web-application"

  const prompt=[
    "Execute one authorized bug-bounty validation task.",
    "Stay within the supplied target and scope.",
    "Use non-destructive validation and preserve evidence.",
    "Load and follow the resolved CyberStrike skills.",
    "Do not modify skill files or learning data.",
    "Do not declare a vulnerability without sufficient evidence.",
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
    `reference_ids: ${(context.referenceIds ?? []).join(", ") || "(none)"}`,
    `reference_urls: ${(context.referenceUrls ?? []).join(", ") || "(none)"}`,
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
