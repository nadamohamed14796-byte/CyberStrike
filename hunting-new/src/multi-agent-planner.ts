import type { SignalEngine, SkillRule, SkillSelection } from "./signals"
import { routeSkills, type RoutingDecision } from "./skill-router"
import type { LearningEngine } from "./learning-engine"
import type { FalsePositiveIntelligence } from "./false-positive-intelligence"

export type HuntingAgentRole =
  | "primary-hunter"
  | "validator"
  | "correlator"
  | "reviewer"

export interface AgentTask {
  id: string
  role: HuntingAgentRole
  skill: string
  signal: string
  target: string
  priority: number
  reason: string
  dependencies: string[]
  maxParallelTasks: number
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
      const task: AgentTask = {
        id: `task-${tasks.length + 1}`,
        role,
        skill: skill.name,
        signal: signal.signal,
        target,
        priority: Math.round((skill.score * 100) + signal.confidence * 100 + (skill.priority ?? 0)),
        reason: `signal=${signal.signal}; confidence=${signal.confidence.toFixed(2)}; skill score=${skill.score.toFixed(2)}`,
        dependencies: role === "validator" ? ["primary-hunter"] : [],
        maxParallelTasks: Math.max(1, skill.maximum_parallel_tasks ?? 1),
      }
      tasks.push(task)
      lanes[role].push(task)
    }
  }

  tasks.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
  for (const role of Object.keys(lanes) as HuntingAgentRole[]) {
    lanes[role].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
  }

  return {
    target,
    mode: decision.mode,
    reason: decision.reason,
    tasks,
    lanes,
  }
}

export function nextAgentTasks(plan: MultiAgentPlan, limit = 4): AgentTask[] {
  const active = new Set<string>()
  const selected: AgentTask[] = []

  for (const task of plan.tasks) {
    if (selected.length >= Math.max(1, limit)) break
    if (task.dependencies.some(dep => !active.has(dep) && dep !== "primary-hunter")) continue
    if (active.has(task.skill)) continue
    active.add(task.skill)
    selected.push(task)
  }

  return selected
}
