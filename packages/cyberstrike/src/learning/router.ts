import { ReferenceLearning } from "./reference"
import { SkillIndex } from "../skill/index-engine"

export type LearningHook =
  | "before_recon"
  | "during_testing"
  | "after_finding"
  | "after_triage"
  | "before_summary"

export type LearningSignal = {
  hook: LearningHook
  signal: string
  sessionID?: string
  skill_name?: string
  cwe_id?: string
  category?: string
  tags?: string[]
  tech_stack?: string[]
  target?: string
  agent?: string
  outcome?: string
  evidence?: string
  metadata?: Record<string, unknown>
}

export type RoutedSkill = {
  name: string
  score: number
  reasons: string[]
}

const HOOK_QUERIES: Record<LearningHook, string[]> = {
  before_recon: ["recon", "enumeration", "asset"],
  during_testing: ["testing", "security"],
  after_finding: ["vulnerability", "reporting"],
  after_triage: ["triage", "validation", "reporting"],
  before_summary: ["reporting", "summary", "validation"],
}

export namespace LearningRouter {
  function add(
    candidates: Map<string, { score: number; reasons: string[] }>,
    name: string,
    score: number,
    reason: string,
  ) {
    const current = candidates.get(name)
    if (current) {
      current.score += score
      if (!current.reasons.includes(reason)) current.reasons.push(reason)
      return
    }
    candidates.set(name, { score, reasons: [reason] })
  }

  /**
   * Deterministic signal -> skill routing.
   * The router only ranks existing reference skills; it never edits their source.
   */
  export function route(signal: LearningSignal, limit = 8): RoutedSkill[] {
    const candidates = new Map<string, { score: number; reasons: string[] }>()

    if (signal.skill_name) {
      add(candidates, signal.skill_name, 100, "explicit skill signal")
    }

    if (signal.cwe_id) {
      for (const entry of SkillIndex.byCWE(signal.cwe_id, 20)) {
        add(candidates, entry.name, 45, `matches ${signal.cwe_id}`)
      }
    }

    if (signal.category) {
      for (const entry of SkillIndex.byCategory(signal.category, 20)) {
        add(candidates, entry.name, 30, `matches category ${signal.category}`)
      }
    }

    for (const tag of signal.tags ?? []) {
      for (const entry of SkillIndex.byTag(tag, 15)) {
        add(candidates, entry.name, 20, `matches tag ${tag}`)
      }
    }

    if (signal.tech_stack?.length) {
      for (const entry of SkillIndex.byTechStack(signal.tech_stack, 20)) {
        add(candidates, entry.name, 20, "matches technology stack")
      }
    }

    for (const query of HOOK_QUERIES[signal.hook]) {
      for (const entry of SkillIndex.search(query, 12)) {
        add(candidates, entry.name, 8, `matches ${signal.hook} phase`)
      }
    }

    // Raw free-text signals are ambiguous by default. Only use them for routing
    // when the producer explicitly marks the signal as concrete evidence.
    if (signal.metadata?.concrete_signal === true) {
      const signalTerms = signal.signal
        .replace(/[^a-zA-Z0-9:_-]+/g, " ")
        .split(/\s+/)
        .filter((term) => term.length >= 3)
      for (const term of signalTerms) {
        for (const entry of SkillIndex.search(term, 12)) {
          add(candidates, entry.name, 15, `matches concrete signal term ${term}`)
        }
      }
    }

    return Array.from(candidates.entries())
      .map(([name, value]) => {
        let learned = 50
        try {
          learned = ReferenceLearning.score(name)
        } catch {}
        const learningBoost = Math.max(-10, Math.min(10, Math.round((learned - 50) / 5)))
        return {
          name,
          score: value.score + learningBoost,
          reasons: [...value.reasons, `learned usefulness=${learned}%`],
        }
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, limit)
  }
}
