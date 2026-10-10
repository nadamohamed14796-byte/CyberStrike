import type { SignalEngine, SkillRule, SkillSelection } from "./signals"
import { routeSkills, routeRegisteredSkills, type RoutingDecision } from "./skill-router"
import type { LearningEngine } from "./learning-engine"
import type { FalsePositiveIntelligence } from "./false-positive-intelligence"
import type { SkillRegistry, SkillMetadata } from "./skill-registry"
import { canonicalSignal } from "./canonical-signals"

export type HuntingAgentRole = "primary-hunter" | "validator" | "correlator" | "reviewer"

export interface AgentTask {
  id: string
  role: HuntingAgentRole
  skill: string
  signal: string
  signalConfidence: number
  requestId?: string
  accountLabel?: string
  parameterId?: string
  endpoint?: string
  functionId?: string
  target: string
  priority: number
  reason: string
  dependencies: string[]
  maxParallelTasks: number
  strategyHints: string[]
  resolvedSkills?: string[]
  resolvedSkillPaths?: string[]
  recommendedAgent?: string
  referenceIds?: string[]
  referenceUrls?: string[]
}

export interface AgentExecutionSelection {
  taskId: string
  primarySkill: string
  skills: SkillMetadata[]
  strategyHints: string[]
}

export interface MultiAgentPlan {
  target: string
  mode: RoutingDecision["mode"]
  reason: string
  tasks: AgentTask[]
  lanes: Record<HuntingAgentRole, AgentTask[]>
}


function registryFromRules(rules: SkillRule[]): SkillRegistry {
  return new SkillRegistry(rules.map(rule => ({
    name: rule.name,
    category: "legacy-rule",
    description: rule.name,
    triggers: [...rule.required_signals, ...(rule.optional_signals ?? [])],
    required_context: [],
    dependencies: rule.dependencies ?? [],
    risk_level: "medium" as const,
    scope_requirements: [],
    validation_requirements: [],
    confidence_threshold: rule.confidence_threshold,
    maximum_parallel_tasks: rule.maximum_parallel_tasks ?? 1,
  })))
}

function stableTaskId(target:string,skill:SkillSelection,signal:{signal:string;endpoint?:string;function_id?:string;metadata?:Record<string,unknown>}):string{
  const identity=[
    target,
    skill.name,
    canonicalSignal(signal.signal),
    signal.endpoint??"",
    signal.function_id??"",
    typeof signal.metadata?.requestId==="string" ? signal.metadata.requestId : "",
    typeof signal.metadata?.accountLabel==="string" ? signal.metadata.accountLabel : "",
    typeof signal.metadata?.parameterId==="string" ? signal.metadata.parameterId : "",
  ].join("|")
  return "task-"+Bun.hash(identity).toString(16)
}

function roleForSkill(skill: SkillSelection, registry?: SkillRegistry): HuntingAgentRole {
  const explicit = registry?.get(skill.name)?.agent_roles?.[0]
  if (explicit) return explicit
  const name = skill.name.toLowerCase()
  if (name.includes("validate") || name.includes("verify")) return "validator"
  if (name.includes("correlat") || name.includes("js") || name.includes("proxy")) return "correlator"
  if (name.includes("review") || name.includes("report")) return "reviewer"
  return "primary-hunter"
}

function strategyHints(signal: string, skill: string): string[] {
  const value = (signal + " " + skill).toLowerCase()
  const hints = new Set<string>()
  if (/(waf|firewall|filter|blocked|403|429)/.test(value)) hints.add("waf-aware")
  if (/(idor|authorization|access|auth)/.test(value)) hints.add("account-context")
  if (/(js|javascript|source|bundle)/.test(value)) hints.add("js-correlation")
  if (/(api|graphql|rest|endpoint)/.test(value)) hints.add("api-surface")
  return [...hints]
}

function dependencyRoles(role: HuntingAgentRole): HuntingAgentRole[] {
  if (role === "validator") return ["primary-hunter"]
  if (role === "reviewer") return ["validator"]
  return []
}

export function buildMultiAgentPlanFromRegistry(
  engine: SignalEngine,
  registry: SkillRegistry,
  target: string,
  learning?: LearningEngine,
  falsePositives?: FalsePositiveIntelligence,
): MultiAgentPlan {
  const signals = engine.forTarget(target)

  const decision: RoutingDecision = routeRegisteredSkills(engine, registry, target, learning, falsePositives)

  const signalsForSkill = (skill: SkillSelection) => signals.filter(signal => skill.matchedSignals.includes(canonicalSignal(signal.signal)))
  const lanes: MultiAgentPlan["lanes"] = {
    "primary-hunter": [],
    validator: [],
    correlator: [],
    reviewer: [],
  }
  const tasks: AgentTask[] = []
  const seen = new Set<string>()

  for (const skill of decision.skills) {
    for (const signal of signalsForSkill(skill)) {
      const key = [
        skill.name,
        canonicalSignal(signal.signal),
        signal.endpoint ?? "",
        signal.function_id ?? "",
        typeof signal.metadata?.requestId === "string" ? signal.metadata.requestId : "",
        typeof signal.metadata?.accountLabel === "string" ? signal.metadata.accountLabel : typeof signal.metadata?.credentialId === "string" ? signal.metadata.credentialId : "",
        typeof signal.metadata?.parameterId === "string" ? signal.metadata.parameterId : "",
      ].join("|")
      if (seen.has(key)) continue
      seen.add(key)
      const role = roleForSkill(skill, registry)
      const hints = strategyHints(signal.signal, skill.name)
      const task: AgentTask = {
        id: stableTaskId(target,skill,signal),
        role,
        skill: skill.name,
        signal: signal.signal,
        signalConfidence: signal.confidence,
        requestId: typeof signal.metadata?.requestId === "string" ? signal.metadata.requestId : undefined,
        accountLabel: typeof signal.metadata?.accountLabel === "string" ? signal.metadata.accountLabel : typeof signal.metadata?.credentialId === "string" ? signal.metadata.credentialId : undefined,
        parameterId: typeof signal.metadata?.parameterId === "string" ? signal.metadata.parameterId : undefined,
        endpoint: signal.endpoint,
        functionId: signal.function_id,
        target,
        priority: Math.round((skill.score * 100) + signal.confidence * 100 + (skill.priority ?? 0)),
        reason: `signal=${signal.signal}; confidence=${signal.confidence.toFixed(2)}; registry skill=${skill.name}`,
        dependencies: dependencyRoles(role),
        maxParallelTasks: Math.max(1, skill.maximum_parallel_tasks ?? 1),
        strategyHints: hints,
        recommendedAgent: registry?.get(skill.name)?.agent,
      }
      tasks.push(task)
      lanes[role].push(task)
    }
  }

  tasks.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
  for (const role of Object.keys(lanes) as HuntingAgentRole[]) {
    lanes[role].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
  }

  return { target, mode: decision.mode, reason: decision.reason, tasks, lanes }
}

export function buildMultiAgentPlan(
  engine: SignalEngine,
  rules: SkillRule[],
  target: string,
  learning?: LearningEngine,
  falsePositives?: FalsePositiveIntelligence,
): MultiAgentPlan {
  const decision = routeSkills(engine, rules, target, learning, falsePositives)
  const signals = engine.forTarget(target)
  const signalsForSkill = (skill: SkillSelection) =>
    signals.filter(signal => skill.matchedSignals.includes(canonicalSignal(signal.signal)))
  const lanes: MultiAgentPlan["lanes"] = {
    "primary-hunter": [],
    validator: [],
    correlator: [],
    reviewer: [],
  }

  const tasks: AgentTask[] = []
  const seen = new Set<string>()

  for (const skill of decision.skills) {
    const matched = signalsForSkill(skill).sort((a, b) => b.confidence - a.confidence)

    for (const signal of matched) {
      const key = [
        skill.name,
        canonicalSignal(signal.signal),
        signal.endpoint ?? "",
        signal.function_id ?? "",
        typeof signal.metadata?.requestId === "string" ? signal.metadata.requestId : "",
        typeof signal.metadata?.accountLabel === "string" ? signal.metadata.accountLabel : typeof signal.metadata?.credentialId === "string" ? signal.metadata.credentialId : "",
        typeof signal.metadata?.parameterId === "string" ? signal.metadata.parameterId : "",
      ].join("|")
      if (seen.has(key)) continue
      seen.add(key)

      const role = roleForSkill(skill)
      const hints = strategyHints(signal.signal, skill.name)
      const task: AgentTask = {
        id: stableTaskId(target,skill,signal),
        role,
        skill: skill.name,
        signal: signal.signal,
        signalConfidence: signal.confidence,
        requestId: typeof signal.metadata?.requestId === "string" ? signal.metadata.requestId : undefined,
        accountLabel: typeof signal.metadata?.accountLabel === "string" ? signal.metadata.accountLabel : typeof signal.metadata?.credentialId === "string" ? signal.metadata.credentialId : undefined,
        parameterId: typeof signal.metadata?.parameterId === "string" ? signal.metadata.parameterId : undefined,
        endpoint: signal.endpoint,
        functionId: signal.function_id,
        target,
        priority: Math.round((skill.score * 100) + signal.confidence * 100 + (skill.priority ?? 0)),
        reason: `signal=${signal.signal}; confidence=${signal.confidence.toFixed(2)}; skill score=${skill.score.toFixed(2)}`,
        dependencies: dependencyRoles(role),
        maxParallelTasks: Math.max(1, skill.maximum_parallel_tasks ?? 1),
        strategyHints: hints,
      }
      tasks.push(task)
      lanes[role].push(task)
    }
  }

  tasks.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
  for (const role of Object.keys(lanes) as HuntingAgentRole[]) {
    lanes[role].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
  }

  return { target, mode: decision.mode, reason: decision.reason, tasks, lanes }
}

export function resolveAgentTaskSkills(task: AgentTask, registry: SkillRegistry): AgentExecutionSelection {
  const triggerNames = new Set<string>([task.signal, ...task.strategyHints])
  const resolved = registry.selectForTask(task.skill, [...triggerNames], task.signalConfidence)
  return {
    taskId: task.id,
    primarySkill: task.skill,
    skills: resolved,
    strategyHints: [...task.strategyHints],
  }
}

export function nextAgentTasks(plan: MultiAgentPlan, limit = 4): AgentTask[] {
  const selected: AgentTask[] = []
  const selectedSkills = new Set<string>()
  const selectedRoles = new Set<HuntingAgentRole>()
  const remaining = [...plan.tasks]

  while (selected.length < Math.max(1, limit) && remaining.length) {
    const index = remaining.findIndex(task =>
      !selectedSkills.has(task.skill) &&
      task.dependencies.every(dep => selectedRoles.has(dep)),
    )

    if (index === -1) break
    const [task] = remaining.splice(index, 1)
    selected.push(task)
    selectedSkills.add(task.skill)
    selectedRoles.add(task.role)
  }

  return selected
}

export interface DispatchBatch {
  tasks: AgentTask[]
  blocked: AgentTask[]
}

export function dispatchAgentTasks(plan: MultiAgentPlan, states: Map<string, "pending" | "claimed" | "running" | "completed" | "failed" | "blocked">, limit = 4): DispatchBatch {
  const activeBySkill = new Map<string, number>()
  for (const task of plan.tasks) {
    const state = states.get(task.id)
    if (state === "running" || state === "claimed") {
      activeBySkill.set(task.skill, (activeBySkill.get(task.skill) ?? 0) + 1)
    }
  }

  const selected: AgentTask[] = []
  const blocked: AgentTask[] = []
  const dependencyBlocked: AgentTask[] = []
  const completed = new Set([...states.entries()].filter(([, state]) => state === "completed").map(([id]) => id))
  const dependencyCandidates = (task: AgentTask, role: HuntingAgentRole) => {
    const strongIdentity = Boolean(task.requestId || task.functionId || task.parameterId)
    return plan.lanes[role].filter(dep =>
      dep.target === task.target &&
      (strongIdentity || dep.signal === task.signal) &&
      (task.endpoint ? dep.endpoint === task.endpoint : true) &&
      (task.functionId ? dep.functionId === task.functionId : true) &&
      (task.requestId ? dep.requestId === task.requestId : true) &&
      (task.accountLabel ? dep.accountLabel === task.accountLabel : true) &&
      (task.parameterId ? dep.parameterId === task.parameterId : true),
    )
  }
  const dependenciesSatisfied = (task: AgentTask): boolean =>
    task.dependencies.every(role => {
      const candidates = dependencyCandidates(task, role)
      return candidates.length > 0 && candidates.some(dep => completed.has(dep.id))
    })
  const dependencyCannotComplete = (task: AgentTask): boolean =>
    task.dependencies.some(role => {
      const candidates = dependencyCandidates(task, role)
      return candidates.length === 0 || candidates.every(dep => {
        const state = states.get(dep.id) ?? "pending"
        return state === "failed" || state === "blocked"
      })
    })

  for (const task of [...plan.tasks].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))) {
    const state = states.get(task.id) ?? "pending"
    if (state !== "pending") continue
    if (!dependenciesSatisfied(task)) {
      if (dependencyCannotComplete(task)) dependencyBlocked.push(task)
      continue
    }

    const activeForSkill = activeBySkill.get(task.skill) ?? 0
    if (activeForSkill >= task.maxParallelTasks) {
      blocked.push(task)
      continue
    }
    if (selected.length >= Math.max(1, limit)) break

    selected.push(task)
    activeBySkill.set(task.skill, activeForSkill + 1)
  }

  return { tasks: selected, blocked, dependencyBlocked }
}
