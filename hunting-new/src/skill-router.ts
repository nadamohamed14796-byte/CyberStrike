import type { SignalEngine, SkillRule, SkillSelection } from "./signals"
import { prioritizeSkills } from "./learned-prioritization"
import type { LearningEngine } from "./learning-engine"
import type { FalsePositiveIntelligence } from "./false-positive-intelligence"
import type { SkillRegistry } from "./skill-registry"
import { canonicalSignal } from "./canonical-signals"

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


export function routeRegisteredSkills(
  engine: SignalEngine,
  registry: SkillRegistry,
  target: string,
  learning?: LearningEngine,
  falsePositives?: FalsePositiveIntelligence,
): RoutingDecision {
  const signals = engine.forTarget(target)
  if (!signals.length) return { skills: [], mode: "idle", reason: "no signals available" }

  const selected: SkillSelection[] = []
  for (const metadata of registry.list()) {
    const matchedSignals = [...new Set(
      signals
        .filter(signal =>
          signal.confidence >= metadata.confidence_threshold &&
          metadata.triggers.some(trigger => canonicalSignal(trigger) === canonicalSignal(signal.signal)),
        )
        .map(signal => canonicalSignal(signal.signal)),
    )]
    if (!matchedSignals.length) continue
    selected.push({
      name: metadata.name,
      confidence_threshold: metadata.confidence_threshold,
      required_signals: matchedSignals,
      optional_signals: metadata.triggers,
      dependencies: metadata.dependencies,
      priority: 0,
      maximum_parallel_tasks: metadata.maximum_parallel_tasks,
      matchedSignals,
      score: matchedSignals.length / Math.max(1, metadata.triggers.length),
    })
  }

  if (!selected.length) {
    return { skills: [], mode: "idle", reason: "signals present but no registered skill passed its confidence gate" }
  }

  if (!learning) {
    return { skills: selected, mode: "focused", reason: "skills selected from the canonical registry and observed signals" }
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
    reason: "skills selected from the canonical registry and reordered by bounded learning history",
    learned,
  }
}
