import type { SignalEngine, SkillRule, SkillSelection } from "./signals"
import { prioritizeSkills } from "./learned-prioritization"
import type { LearningEngine } from "./learning-engine"
import type { FalsePositiveIntelligence } from "./false-positive-intelligence"

export interface RoutingDecision {
  skills: SkillSelection[]
  mode: "idle" | "focused"
  reason: string
  learned?: ReturnType<typeof prioritizeSkills>
}

export function routeSkills(
  engine: SignalEngine,
  rules: SkillRule[],
  target?: string,
  learning?: LearningEngine,
  falsePositives?: FalsePositiveIntelligence,
): RoutingDecision {
  const signals = target ? engine.forTarget(target) : engine.list()
  if (!signals.length) return { skills: [], mode: "idle", reason: "no signals available" }

  const selected = engine.selectSkills(rules, target).filter(skill =>
    skill.matchedSignals.some(name => signals.some(signal => signal.signal === name))
  )
  if (!selected.length) {
    return { skills: [], mode: "idle", reason: "signals present but no skill passed its confidence gate" }
  }

  if (!learning || !target) {
    return { skills: selected, mode: "focused", reason: "skills selected from observed signals" }
  }

  const learned = prioritizeSkills(selected, learning, target, undefined, falsePositives)
  const rank = new Map(learned.map((item, index) => [item.skill, index]))
  const ordered = [...selected].sort((a, b) =>
    (rank.get(a.name) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.name) ?? Number.MAX_SAFE_INTEGER) ||
    b.score - a.score ||
    (b.priority ?? 0) - (a.priority ?? 0)
  )

  return {
    skills: ordered,
    mode: "focused",
    reason: "skills selected from signals and reordered by bounded learning history",
    learned,
  }
}
