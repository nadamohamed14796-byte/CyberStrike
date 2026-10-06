import type { LearningEngine } from "./learning-engine"
import type { SkillRule } from "./signals"
import type { FalsePositiveIntelligence } from "./false-positive-intelligence"

export interface LearnedPriority {
  skill: string
  signal?: string
  basePriority: number
  learningUtility: number
  falsePositivePenalty: number
  adjustedPriority: number
}

export function prioritizeSkills(
  rules: SkillRule[],
  learning: LearningEngine,
  target: string,
  signal?: string,
  falsePositives?: FalsePositiveIntelligence,
): LearnedPriority[] {
  const scores = learning.score(target)
  const signals = signal ? [signal] : [...new Set(
    rules.flatMap(rule => rule.required_signals),
  )]

  const candidates = rules.flatMap(rule =>
    signals
      .filter(currentSignal => rule.required_signals.includes(currentSignal))
      .map(currentSignal => {
        const relevant = scores.filter(x => x.key.startsWith(currentSignal + "|" + rule.name + "|"))
        const utility = relevant.length ? Math.max(...relevant.map(x => x.utility)) : 0
        const fpPenalty = falsePositives
          ? falsePositives.list(target)
              .filter(x => x.signal === currentSignal && x.skill === rule.name)
              .reduce((sum, x) => sum + Math.min(0.75, 0.05 * x.count), 0)
          : 0

        return {
          skill: rule.name,
          signal: currentSignal,
          basePriority: rule.priority ?? 0,
          learningUtility: utility,
          falsePositivePenalty: fpPenalty,
          adjustedPriority: (rule.priority ?? 0) + (utility * 10) - (fpPenalty * 10),
        }
      }),
  )

  return candidates.sort((a, b) =>
    (b.adjustedPriority - a.adjustedPriority) ||
    ((b.learningUtility - a.learningUtility)) ||
    ((b.basePriority - a.basePriority)),
  )
}
