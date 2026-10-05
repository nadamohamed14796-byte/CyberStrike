import type { Attempt, AttemptState } from "./adaptive-attempts"
import { recordLearning } from "./learning-store"
import { loadFalsePositives, hydrateFalsePositiveIntelligence, recordFalsePositive } from "./false-positive-store"
import type { HypothesisRecord } from "./hypotheses"

export type AttemptLearningOutcome = "confirmed" | "false_positive" | "inconclusive"

export interface AttemptLearningMetadata {
  skill?: string
  endpoint?: string
  accountMode?: string
  confidence?: number
  timestamp?: string
}

export interface AttemptLearningFeedback {
  outcome?: AttemptLearningOutcome
  learningRecorded: boolean
  falsePositiveRecorded: boolean
}

export function deriveAttemptLearningOutcome(
  attemptState: AttemptState,
  hypothesisStatus: HypothesisRecord["status"],
): AttemptLearningOutcome | undefined {
  if (attemptState === "confirmed" && hypothesisStatus === "confirmed") return "confirmed"
  if (attemptState === "rejected" && hypothesisStatus === "rejected") return "false_positive"
  if (attemptState === "inconclusive") return "inconclusive"
  return undefined
}

export async function recordAttemptLearningFeedback(
  root: string,
  target: string,
  attempt: Attempt,
  hypothesis: HypothesisRecord,
  hypothesisStatus: HypothesisRecord["status"],
  metadata: AttemptLearningMetadata = {},
): Promise<AttemptLearningFeedback> {
  const outcome = deriveAttemptLearningOutcome(attempt.state, hypothesisStatus)
  if (!outcome) {
    return { outcome, learningRecorded: false, falsePositiveRecorded: false }
  }

  const confidence = Math.max(0, Math.min(1, metadata.confidence ?? hypothesis.confidence))
  const timestamp = metadata.timestamp ?? new Date().toISOString()
  const skill = metadata.skill ?? "unknown"
  const endpoint = metadata.endpoint ?? hypothesis.endpoint

  await recordLearning(root, target, {
    target,
    signal: hypothesis.signal,
    skill,
    strategy: attempt.strategy,
    outcome,
    confidence,
    timestamp,
  })

  let falsePositiveRecorded = false
  if (outcome === "false_positive") {
    const state = await loadFalsePositives(root, target)
    const intelligence = hydrateFalsePositiveIntelligence(state)
    const record = intelligence.record({
      target,
      signal: hypothesis.signal,
      skill,
      strategy: attempt.strategy,
      endpoint,
      accountMode: metadata.accountMode,
      reason: attempt.resultSummary ?? attempt.reason,
      evidenceIds: attempt.evidenceIds,
      confidence,
      timestamp,
    })
    await recordFalsePositive(root, target, record)
    falsePositiveRecorded = true
  }

  return { outcome, learningRecorded: true, falsePositiveRecorded }
}
