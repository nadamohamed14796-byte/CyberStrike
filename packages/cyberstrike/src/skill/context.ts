import { Log } from "../util/log"
import { Skill } from "./skill"
import { SkillIndex } from "./index-engine"
import { ReferenceLearning } from "../learning/reference"
import { LearningRouter } from "../learning/router"

export namespace SkillContext {
  const log = Log.create({ service: "skill-context" })

  const loaded = new Map<string, { content: string; tokens: number }>()

  function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  export async function load(name: string): Promise<string | undefined> {
    if (loaded.has(name)) return loaded.get(name)!.content

    const skill = await Skill.get(name)
    if (!skill) {
      log.warn("skill not found for loading", { name })
      return undefined
    }

    const tokens = estimateTokens(skill.content)
    loaded.set(name, { content: skill.content, tokens })
    log.info("skill loaded into context", { name, tokens })
    return skill.content
  }

  export function unload(name: string): boolean {
    const had = loaded.has(name)
    if (had) {
      log.info("skill unloaded from context", { name, tokens: loaded.get(name)!.tokens })
      loaded.delete(name)
    }
    return had
  }

  export function active(): string[] {
    return Array.from(loaded.keys())
  }

  export function tokenCount(): number {
    let total = 0
    for (const entry of loaded.values()) total += entry.tokens
    return total
  }

  export function isLoaded(name: string): boolean {
    return loaded.has(name)
  }

  export function clear() {
    loaded.clear()
    log.info("context cleared")
  }

  export type Suggestion = {
    name: string
    reason: string
    priority: "high" | "medium" | "low"
  }

  export function suggest(
    findings: Array<{ skill_id: string; severity?: string; cwe_id?: string; tech_stack?: string[] }>,
  ): Suggestion[] {
    const result = new Map<string, Suggestion>()
    const active = new Set(loaded.keys())

    const add = (name: string, priority: Suggestion["priority"], reason: string) => {
      if (active.has(name)) return
      const current = result.get(name)
      if (current) {
        current.reason = `${current.reason} | ${reason}`
        if (priority === "high" || (priority === "medium" && current.priority === "low")) current.priority = priority
        return
      }
      result.set(name, { name, reason, priority })
    }

    for (const finding of findings) {
      const learnedRoutes = LearningRouter.route({
        hook: "after_finding",
        signal: "finding_followup",
        skill_name: finding.skill_id,
        cwe_id: finding.cwe_id,
        tech_stack: finding.tech_stack,
      })

      for (const route of learnedRoutes) {
        const priority: Suggestion["priority"] = route.score >= 80 ? "high" : route.score >= 40 ? "medium" : "low"
        add(route.name, priority, route.reasons.join("; "))
      }

      const chains = SkillIndex.chainsFrom(finding.skill_id)
      for (const chain of chains) {
        const learned = ReferenceLearning.score(chain.target)
        add(
          chain.target,
          chain.boost || learned >= 70 ? "high" : learned < 30 ? "low" : "medium",
          `${chain.boost ?? `chains with ${finding.skill_id}`} | learned usefulness=${learned}%`,
        )
      }

      if (finding.tech_stack?.length) {
        for (const skill of SkillIndex.byTechStack(finding.tech_stack)) {
          const learned = ReferenceLearning.score(skill.name)
          add(
            skill.name,
            learned >= 70 ? "medium" : "low",
            `matches tech stack: ${finding.tech_stack.join(", ")} | learned usefulness=${learned}%`,
          )
        }
      }
    }

    const order = { high: 0, medium: 1, low: 2 }
    return Array.from(result.values()).sort(
      (a, b) => order[a.priority] - order[b.priority] || a.name.localeCompare(b.name),
    )
  }
}
