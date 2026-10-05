export type ValidationDecision = "eligible" | "blocked"

export interface ValidationEvidence {
  id: string
  kind: "request" | "response" | "browser" | "js" | "replay" | "inference"
  summary: string
  independent?: boolean
}

export interface ValidationInput {
  hypothesisId: string
  inScope: boolean
  attemptsExecuted: number
  evidence: ValidationEvidence[]
  distinctVariants: number
  expectedImpact?: "none" | "low" | "medium" | "high" | "critical"
}

export interface ValidationResult {
  decision: ValidationDecision
  reasons: string[]
  evidenceIds: string[]
}

export function validateHypothesis(input: ValidationInput): ValidationResult {
  const reasons: string[] = []
  const evidenceIds = input.evidence.map(x => x.id)

  if (!input.inScope) reasons.push("target is out of scope")
  if (input.attemptsExecuted < 1) reasons.push("no validation attempt executed")
  if (input.distinctVariants < 1) reasons.push("no distinct validation variant")
  if (!input.evidence.length) reasons.push("no evidence recorded")
  if (input.evidence.some(x => x.kind === "inference") && input.evidence.filter(x => x.kind !== "inference").length === 0) {
    reasons.push("inference-only evidence is insufficient")
  }
  if (input.expectedImpact === "none") reasons.push("no security impact established")

  const independent = input.evidence.filter(x => x.independent && x.kind !== "inference").length
  if (input.expectedImpact && input.expectedImpact !== "none" && independent < 1) {
    reasons.push("impact needs at least one independent supporting observation")
  }

  return {
    decision: reasons.length ? "blocked" : "eligible",
    reasons,
    evidenceIds,
  }
}
