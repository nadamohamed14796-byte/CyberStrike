export type ValidationDecision = "eligible" | "blocked"

export interface ValidationEvidence {
  id: string
  kind: "request" | "response" | "browser" | "js" | "replay" | "inference"
  summary: string
  independent?: boolean
  observed?: boolean
  attemptId?: string
  requestId?: string
  responseId?: string
}

export interface ValidationInput {
  hypothesisId: string
  inScope: boolean
  attemptsExecuted: number
  evidence: ValidationEvidence[]
  distinctVariants: number
  expectedImpact?: "none" | "low" | "medium" | "high" | "critical"
  targetConfirmed?: boolean
  baselineObserved?: boolean
  behaviorChanged?: boolean
  reproducible?: boolean
  rootCauseSupported?: boolean
  impactObserved?: boolean
  authorizationContextVerified?: boolean
}

export function hasBaselineComparison(evidence: ValidationEvidence[]): boolean {
  const observed=evidence.filter(x=>x.observed !== false && x.kind !== "inference")
  const requestIds=new Set(observed.filter(x=>x.kind==="request" && x.requestId).map(x=>x.requestId!))
  return observed.some(x=>x.kind==="response" && x.requestId && requestIds.has(x.requestId))
}

export function hasBehaviorChange(evidence: ValidationEvidence[]): boolean {
  const observed=evidence.filter(x=>x.observed !== false && x.kind==="response")
  const attempts=new Set(observed.map(x=>x.attemptId).filter(Boolean))
  const responses=new Set(observed.map(x=>x.responseId).filter(Boolean))
  return attempts.size >= 2 || responses.size >= 2
}

export interface ValidationResult {
  decision: ValidationDecision
  reasons: string[]
  evidenceIds: string[]
  checks: Array<{ name: string; passed: boolean }>
}

export function validateHypothesis(input: ValidationInput): ValidationResult {
  const observed = input.evidence.filter(x => x.observed !== false && x.kind !== "inference")
  const independent = observed.filter(x => x.independent).length

  const checks: Array<[string, boolean, string]> = [
    ["scope", input.inScope, "target is out of scope"],
    ["target identity", input.targetConfirmed === true, "target identity/scope was not confirmed"],
    ["execution", input.attemptsExecuted >= 20, "minimum 20 bounded validation attempts have not been completed"],
    ["variant diversity", input.distinctVariants >= 2, "at least two distinct validation variants are required"],
    ["observed evidence", observed.length > 0, "no observed non-inference evidence"],
    ["baseline comparison", input.baselineObserved === true, "no baseline behavior was established"],
    ["behavior change", input.behaviorChanged === true, "no meaningful behavior change was established"],
    ["reproducibility", input.reproducible === true, "result is not reproducible"],
    ["root-cause support", input.rootCauseSupported === true, "root cause is not sufficiently supported"],
    ["impact", input.expectedImpact !== undefined && input.expectedImpact !== "none" && input.impactObserved === true, "security impact was not established"],
  ]

  if (input.evidence.some(x => x.kind === "inference") && observed.length === 0) {
    checks[4][1] = false
    checks[4][2] = "inference-only evidence is insufficient"
  }

  if (input.expectedImpact && input.expectedImpact !== "none" && independent < 1) {
    checks[9][1] = false
    checks[9][2] = "impact needs at least one independent supporting observation"
  }

  if (input.authorizationContextVerified !== true) {
    checks[0][1] = false
    checks[0][2] = "authorization/scope context was not verified"
  }

  const reasons = checks.filter(([, passed]) => !passed).map(([, , reason]) => reason)
  return {
    decision: reasons.length ? "blocked" : "eligible",
    reasons,
    evidenceIds: input.evidence.map(x => x.id),
    checks: checks.map(([name, passed]) => ({ name, passed })),
  }
}
