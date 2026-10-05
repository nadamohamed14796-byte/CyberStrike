import type { LearningEngine } from "./learning-engine"
import type { SkillRule } from "./signals"
import type { FalsePositiveIntelligence } from "./false-positive-intelligence"

export interface LearnedPriority {
  skill: string
  basePriority: number
  learningUtility: number
  adjustedPriority: number
}

export function prioritizeSkills(
  rules: SkillRule[],
  learning: LearningEngine,
  target: string,
  signal: string,
  falsePositives?: FalsePositiveIntelligence,
): LearnedPriority[] {
  const scores = learning.score(target)
  return rules.map(rule => {
    const relevant = scores.filter(x => x.key.startsWith(signal + "|" + rule.name + "|"))
    const utility = relevant.length ? Math.max(...relevant.map(x => x.utility)) : 0
    const fpPenalty = falsePositives
      ? falsePositives.list(target).filter(x => x.signal === signal && x.skill === rule.name).reduce((sum, x) => sum + Math.min(0.75, 0.05 * x.count), 0)
      : 0
    return {
      skill: rule.name,
      basePriority: rule.priority ?? 0,
      learningUtility: utility,
      adjustedPriority: (rule.priority ?? 0) + utility - fpPenalty,
    }
  }).sort((a, b) => b.adjustedPriority - a.adjustedPriority)
}
