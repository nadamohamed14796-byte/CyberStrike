import type { LearningEngine } from "./learning-engine"
import type { SkillRule } from "./signals"

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
): LearnedPriority[] {
  const scores = learning.score(target)
  return rules.map(rule => {
    const relevant = scores.filter(x => x.key.startsWith(signal + "|" + rule.name + "|"))
    const utility = relevant.length ? Math.max(...relevant.map(x => x.utility)) : 0
    return {
      skill: rule.name,
      basePriority: rule.priority ?? 0,
      learningUtility: utility,
      adjustedPriority: (rule.priority ?? 0) + utility,
    }
  }).sort((a, b) => b.adjustedPriority - a.adjustedPriority)
}
