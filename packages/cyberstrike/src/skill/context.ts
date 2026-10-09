import { Log } from "../util/log"
import { Skill } from "./skill"
import { SkillIndex } from "./index-engine"
import { ReferenceLearning } from "../learning/reference"
import { LearningRouter } from "../learning/router"
import { ReportKnowledge } from "../learning/report-knowledge"

export namespace SkillContext {
  const log = Log.create({ service: "skill-context" })

  export const MAX_CONTEXT_TOKENS = 24_000
  type LoadedSkill = { content: string; tokens: number }
  const loaded = new Map<string, Map<string, LoadedSkill>>()

  function sessionLoaded(sessionID: string) {
    let bucket = loaded.get(sessionID)
    if (!bucket) {
      bucket = new Map()
      loaded.set(sessionID, bucket)
    }
    return bucket
  }

  function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  export async function load(name: string, sessionID = "global"): Promise<string | undefined> {
    const bucket = sessionLoaded(sessionID)
    if (bucket.has(name)) return bucket.get(name)!.content

    const skill = await Skill.get(name)
    if (!skill) {
      log.warn("skill not found for loading", { name })
      return undefined
    }

    const tokens = estimateTokens(skill.content)
    const currentTokens = Array.from(bucket.values()).reduce((sum, entry) => sum + entry.tokens, 0)
    if (currentTokens + tokens > MAX_CONTEXT_TOKENS) {
      throw new Error(
        `Loading "${name}" would exceed the skill context budget (${currentTokens + tokens} > ${MAX_CONTEXT_TOKENS} tokens).` +
          " Unload an existing skill or use a narrower specialist.",
      )
    }
    bucket.set(name, { content: skill.content, tokens })
    log.info("skill loaded into context", { name, tokens, sessionID, contextTokens: currentTokens + tokens })
    return skill.content
  }

  export function unload(name: string, sessionID = "global"): boolean {
    const bucket = loaded.get(sessionID)
    if (!bucket) return false
    const entry = bucket.get(name)
    if (!entry) return false
    log.info("skill unloaded from context", { name, sessionID, tokens: entry.tokens })
    bucket.delete(name)
    if (bucket.size === 0) loaded.delete(sessionID)
    return true
  }

  export function active(sessionID = "global"): string[] {
    return Array.from(loaded.get(sessionID)?.keys() ?? [])
  }

  export function tokenCount(sessionID = "global"): number {
    let total = 0
    for (const entry of loaded.get(sessionID)?.values() ?? []) total += entry.tokens
    return total
  }

  export function isLoaded(name: string, sessionID = "global"): boolean {
    return loaded.get(sessionID)?.has(name) ?? false
  }

  export function clear(sessionID?: string) {
    if (sessionID) loaded.delete(sessionID)
    else loaded.clear()
    log.info("context cleared", { sessionID: sessionID ?? "all" })
  }

  export type Suggestion = {
    name: string
    reason: string
    priority: "high" | "medium" | "low"
  }

  export function suggest(
    findings: Array<{ skill_id: string; severity?: string; cwe_id?: string; tech_stack?: string[] }>,
    sessionID = "global",
    limit = 12,
  ): Suggestion[] {
    const result = new Map<string, Suggestion>()
    const active = new Set(loaded.get(sessionID)?.keys() ?? [])

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

      const reportLessons = ReportKnowledge.recommendations({
        cweID: finding.cwe_id,
        signal: finding.skill_id,
        sourceKind: "external_report",
        limit: 3,
      })
      const reportReason = reportLessons.length
        ? `report knowledge: ${reportLessons
            .map((row) => row.lesson || row.title)
            .slice(0, 2)
            .join(" | ")}`
        : ""
      for (const route of learnedRoutes) {
        const priority: Suggestion["priority"] = route.score >= 80 ? "high" : route.score >= 40 ? "medium" : "low"
        add(route.name, priority, [route.reasons.join("; "), reportReason].filter(Boolean).join(" | "))
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
    return Array.from(result.values())
      .sort((a, b) => order[a.priority] - order[b.priority] || a.name.localeCompare(b.name))
      .slice(0, Math.max(1, Math.min(limit, 50)))
  }
}
