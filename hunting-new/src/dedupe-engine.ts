import { falsePositiveFingerprint, type FalsePositiveContext, FalsePositiveIntelligence } from "./false-positive-intelligence"

export interface DedupeContext extends Pick<FalsePositiveContext, "target"|"signal"|"skill"|"strategy"|"endpoint"|"accountMode"> {
  evidenceIds?: string[]
}

export interface DedupeDecision {
  action: "skip" | "recheck"
  fingerprint: string
  reason: string
  penalty: number
}

export function dedupeDecision(
  intelligence: FalsePositiveIntelligence,
  context: DedupeContext,
): DedupeDecision {
  const fingerprint = falsePositiveFingerprint(context)
  const known = intelligence.isKnown(context)
  const penalty = intelligence.penalty(context)
  if (!known) {
    return { action: "recheck", fingerprint, reason: "no matching false-positive history", penalty: 0 }
  }

  return {
    action: "skip",
    fingerprint,
    reason: "matching false-positive history exists for the same target/signal/strategy context",
    penalty,
  }
}

export function shouldRecheckAfterNewEvidence(
  intelligence: FalsePositiveIntelligence,
  context: DedupeContext,
): boolean {
  const record = intelligence.get(context)
  if (!record) return true
  const newEvidence = new Set(context.evidenceIds ?? [])
  const oldEvidence = new Set(record.evidenceIds ?? [])
  for (const id of newEvidence) if (!oldEvidence.has(id)) return true
  return false
}
