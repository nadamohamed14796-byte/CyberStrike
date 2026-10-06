import { SkillIndex } from "./index-engine"

export namespace ChainRegistry {
  export type TransitionState = "signal" | "candidate" | "observed" | "validated" | "handoff" | "finding"

  export type Evidence = {
    state: TransitionState
    key: string
    summary?: string
  }

  export type Plan = {
    skill: string
    from: string
    reason: "chains_with" | "prerequisite" | "context"
    evidence: Evidence
  }

  export const LIMITS = {
    maxHops: 8,
    maxUniqueSkills: 12,
    maxRevisitsPerSkill: 1,
  } as const

  export function known(name: string): boolean {
    return !!SkillIndex.get(name)
  }

  export function eligible(from: string, target: string, completed: Iterable<string>): boolean {
    if (!known(from) || !known(target) || from === target) return false
    const completedSet = new Set(completed)
    if (completedSet.has(target)) return false
    return SkillIndex.prerequisitesFor(target).every((required) => completedSet.has(required))
  }

  export function next(input: {
    from: string
    completed?: Iterable<string>
    evidence: Evidence
    max?: number
  }): Plan[] {
    const fromEntry = SkillIndex.get(input.from)
    if (!fromEntry) return []

    const completed = new Set(input.completed ?? [])
    const limit = Math.max(0, Math.min(input.max ?? 4, LIMITS.maxUniqueSkills))
    const plans: Plan[] = []
    const seen = new Set<string>()

    for (const target of fromEntry.chains_with) {
      if (plans.length >= limit || seen.has(target)) continue
      seen.add(target)
      if (!eligible(input.from, target, completed)) continue
      plans.push({ skill: target, from: input.from, reason: "chains_with", evidence: input.evidence })
    }

    return plans
  }

  export function walk(input: {
    start: string
    completed?: Iterable<string>
    evidence: Evidence
    maxHops?: number
  }): { skills: string[]; transitions: Plan[]; stopped: "limit" | "cycle" | "no-eligible-target" | "unknown-start" } {
    if (!known(input.start)) return { skills: [], transitions: [], stopped: "unknown-start" }

    const skills = [input.start]
    const transitions: Plan[] = []
    const completed = new Set(input.completed ?? [])
    const visited = new Map<string, number>()
    visited.set(input.start, 1)
    const maxHops = Math.min(input.maxHops ?? LIMITS.maxHops, LIMITS.maxHops)

    while (transitions.length < maxHops && skills.length < LIMITS.maxUniqueSkills) {
      const current = skills[skills.length - 1]
      const candidates = next({ from: current, completed, evidence: input.evidence, max: 1 })
      if (!candidates.length) return { skills, transitions, stopped: "no-eligible-target" }

      const transition = candidates[0]
      const count = (visited.get(transition.skill) ?? 0) + 1
      if (count > LIMITS.maxRevisitsPerSkill + 1) return { skills, transitions, stopped: "cycle" }

      visited.set(transition.skill, count)
      transitions.push(transition)
      skills.push(transition.skill)
      completed.add(transition.skill)
    }

    return { skills, transitions, stopped: "limit" }
  }
}
