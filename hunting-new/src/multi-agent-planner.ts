import type { SignalEngine, SkillRule, SkillSelection } from "./signals"
import { routeSkills, type RoutingDecision } from "./skill-router"
import type { LearningEngine } from "./learning-engine"
import type { FalsePositiveIntelligence } from "./false-positive-intelligence"
import type { SkillRegistry, SkillMetadata } from "./skill-registry"

export type HuntingAgentRole = "primary-hunter" | "validator" | "correlator" | "reviewer"

export interface AgentTask {
  id: string
  role: HuntingAgentRole
  skill: string
  signal: string
  signalConfidence: number
  target: string
  priority: number
  reason: string
  dependencies: string[]
  maxParallelTasks: number
  strategyHints: string[]
  resolvedSkills?: string[]
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

function roleForSkill(skill: SkillSelection): HuntingAgentRole {
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

export function buildMultiAgentPlan(
  engine: SignalEngine,
  rules: SkillRule[],
  target: string,
  learning?: LearningEngine,
  falsePositives?: FalsePositiveIntelligence,
): MultiAgentPlan {
  const decision = routeSkills(engine, rules, target, learning, falsePositives)
  const signals = engine.forTarget(target)
  const signalByName = new Map(signals.map(signal => [signal.signal, signal]))
  const lanes: MultiAgentPlan["lanes"] = {
    "primary-hunter": [],
    validator: [],
    correlator: [],
    reviewer: [],
  }

  const tasks: AgentTask[] = []
  const seen = new Set<string>()

  for (const skill of decision.skills) {
    const matched = skill.matchedSignals
      .map(name => signalByName.get(name))
      .filter((signal): signal is NonNullable<typeof signal> => Boolean(signal))
      .sort((a, b) => b.confidence - a.confidence)

    for (const signal of matched) {
      const key = `${skill.name}|${signal.signal}|${signal.endpoint ?? ""}|${signal.function_id ?? ""}`
      if (seen.has(key)) continue
      seen.add(key)

      const role = roleForSkill(skill)
      const hints = strategyHints(signal.signal, skill.name)
      const task: AgentTask = {
        id: `task-${tasks.length + 1}`,
        role,
        skill: skill.name,
        signal: signal.signal,
        signalConfidence: signal.confidence,
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
