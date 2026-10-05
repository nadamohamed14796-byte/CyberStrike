import type { SignalEngine, SkillRule, SkillSelection } from "./signals"

export interface RoutingDecision {
  skills: SkillSelection[]
  mode: "idle" | "focused"
  reason: string
}

export function routeSkills(engine: SignalEngine, rules: SkillRule[], target?: string): RoutingDecision {
  const signals = target ? engine.forTarget(target) : engine.list()
  if (!signals.length) return { skills: [], mode: "idle", reason: "no signals available" }

  const selected = engine.selectSkills(rules, target).filter(skill =>
    skill.matchedSignals.some(name => signals.some(signal => signal.signal === name))
  )

  return {
    skills: selected,
    mode: selected.length ? "focused" : "idle",
    reason: selected.length ? "skills selected from observed signals" : "signals present but no skill passed its confidence gate",
  }
}
