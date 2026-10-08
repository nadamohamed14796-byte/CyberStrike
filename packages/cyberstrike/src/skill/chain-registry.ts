import { SkillIndex } from "./index-engine"
import { Log } from "../util/log"

export namespace ChainRegistry {
  const log = Log.create({ service: "chain-registry" })
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

  function looksLikeSkillReference(value: string): boolean {
    return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value.trim())
  }

  function skillPrerequisites(name: string): string[] {
    return SkillIndex.prerequisitesFor(name).filter((required) => known(required))
  }

  export function invalidReferences(name: string): { chains: string[]; prerequisites: string[] } {
    const entry = SkillIndex.get(name)
    if (!entry) return { chains: [], prerequisites: [] }
    return {
      chains: entry.chains_with.filter((target) => !known(target)),
      prerequisites: entry.prerequisites.filter((required) => looksLikeSkillReference(required) && !known(required)),
    }
  }

  export function eligible(from: string, target: string, completed: Iterable<string>): boolean {
    if (!known(from) || !known(target) || from === target) return false
    const completedSet = new Set(completed)
    if (completedSet.has(target)) return false
    if (invalidReferences(target).prerequisites.length > 0) return false
    return skillPrerequisites(target).every((required) => completedSet.has(required))
  }

  export function next(input: {
    from: string
    completed?: Iterable<string>
    evidence: Evidence
    max?: number
  }): Plan[] {
    const fromEntry = SkillIndex.get(input.from)
    if (!fromEntry) return []
    if (input.evidence.state === "signal") return []

    const invalid = invalidReferences(input.from)
    if (invalid.chains.length > 0 || invalid.prerequisites.length > 0) {
      log.warn("skill chain metadata contains unresolved references", {
        skill: input.from,
        chains: invalid.chains,
        prerequisites: invalid.prerequisites,
      })
    }

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

  export function walk(input: { start: string; completed?: Iterable<string>; evidence: Evidence; maxHops?: number }): {
    skills: string[]
    transitions: Plan[]
    stopped: "limit" | "cycle" | "no-eligible-target" | "unknown-start"
  } {
    if (!known(input.start)) return { skills: [], transitions: [], stopped: "unknown-start" }

    const skills = [input.start]
    const transitions: Plan[] = []
    const completed = new Set(input.completed ?? [])
    completed.add(input.start)
    const visited = new Map<string, number>()
    visited.set(input.start, 1)
    const maxHops = Math.min(input.maxHops ?? LIMITS.maxHops, LIMITS.maxHops)

    while (transitions.length < maxHops && skills.length < LIMITS.maxUniqueSkills) {
      const current = skills[skills.length - 1]
      const candidates = next({ from: current, completed, evidence: input.evidence, max: 1 })
      if (!candidates.length) return { skills, transitions, stopped: "no-eligible-target" }

      const transition = candidates[0]
      if (skills.includes(transition.skill)) {
        return { skills, transitions, stopped: "cycle" }
      }
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
