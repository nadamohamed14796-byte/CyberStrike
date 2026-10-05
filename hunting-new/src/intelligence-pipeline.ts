import { SignalEngine, type SkillRule } from "./signals"
import { HypothesisStore, type HypothesisRecord } from "./hypotheses"
import { ChainBoard, type Chain } from "./chain-board"
import { validateHypothesis, type ValidationEvidence } from "./validation-gate"
import { prioritizeSkills } from "./learned-prioritization"
import type { LearningEngine } from "./learning-engine"
import type { FalsePositiveIntelligence } from "./false-positive-intelligence"

export interface IntelligencePipelineResult {
  hypotheses: HypothesisRecord[]
  chains: Chain[]
}

export function buildIntelligencePipeline(
  engine: SignalEngine,
  rules: SkillRule[],
  target?: string,
  learning?: LearningEngine,
  falsePositives?: FalsePositiveIntelligence,
): IntelligencePipelineResult {
  const signals = target ? engine.forTarget(target) : engine.list()
  const store = new HypothesisStore()

  for (const signal of signals) {
    store.fromSignal(signal)
  }

  const selected = engine.selectSkills(rules, target)
  const prioritized = target && learning && signals.length
    ? prioritizeSkills(selected, learning, target, signals[0].signal, falsePositives)
    : []
  const selectedNames = new Set((prioritized.length ? prioritized : selected.map(skill => ({ skill: skill.name }))).map(x => x.skill))
  const relevant = selected.length
    ? store.list().filter(h => selected.some(skill => selectedNames.has(skill.name) && skill.required_signals.includes(h.signal)))
    : []

  const board = new ChainBoard()
  const chains = relevant.map(h => board.create(
    `${h.signal} validation chain`,
    [h],
  ))

  return { hypotheses: relevant, chains }
}

export function gateHypothesis(
  hypothesis: HypothesisRecord,
  evidence: ValidationEvidence[],
  attemptsExecuted: number,
  distinctVariants: number,
) {
  return validateHypothesis({
    hypothesisId: hypothesis.id,
    inScope: true,
    attemptsExecuted,
    evidence,
    distinctVariants,
    expectedImpact: "medium",
  })
}
