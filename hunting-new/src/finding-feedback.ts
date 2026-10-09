import type { FindingRecord } from "./findings"
import type { LearningObservation } from "./learning-engine"
import { recordLearning } from "./learning-store"
import { FalsePositiveIntelligence } from "./false-positive-intelligence"
import { recordFalsePositive } from "./false-positive-store"

export type FindingOutcome = "confirmed" | "false_positive" | "inconclusive"

export interface FindingFeedback {
  target: string
  signal: string
  skill: string
  strategy: string
  outcome: FindingOutcome
  confidence: number
  findingId: string
  endpoint?: string
  accountMode?: string
  reason?: string
}

export async function applyFindingFeedback(
  root: string,
  feedback: FindingFeedback,
  falsePositives?: FalsePositiveIntelligence,
): Promise<LearningObservation> {
  const timestamp = new Date().toISOString()
  const observation: Omit<LearningObservation,"timestamp"> = {
    target: feedback.target,
    signal: feedback.signal,
    skill: feedback.skill,
    strategy: feedback.strategy,
    outcome: feedback.outcome,
    confidence: feedback.confidence,
  }

  await recordLearning(root, feedback.target, { ...observation, timestamp })

  if (feedback.outcome === "false_positive") {
    const intelligence = falsePositives ?? new FalsePositiveIntelligence()
    const record = intelligence.record({
      target: feedback.target,
      signal: feedback.signal,
      skill: feedback.skill,
      strategy: feedback.strategy,
      endpoint: feedback.endpoint,
      accountMode: feedback.accountMode,
      reason: feedback.reason ?? "finding rejected as false positive",
      evidenceIds: [feedback.findingId],
      confidence: feedback.confidence,
      timestamp,
    })
    await recordFalsePositive(root, feedback.target, record)
  }

  return { ...observation, timestamp }
}

export function feedbackFromFinding(
  finding: FindingRecord,
  signal: string,
  skill: string,
  strategy: string,
  outcome: FindingOutcome,
  endpoint?: string,
): FindingFeedback {
  return {
    target: finding.target,
    signal,
    skill,
    strategy,
    outcome,
    confidence: outcome === "confirmed" ? 1 : finding.status === "rejected" ? .9 : .5,
    findingId: finding.id,
    endpoint,
    reason: outcome === "false_positive" ? "finding rejected during validation" : undefined,
  }
}
