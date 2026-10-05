export type ValidationDecision = "eligible" | "blocked"

export interface ValidationEvidence {
  id: string
  kind: "request" | "response" | "browser" | "js" | "replay" | "inference"
  summary: string
  independent?: boolean
  observed?: boolean
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
    ["target identity", input.targetConfirmed !== false, "target identity/scope was not confirmed"],
    ["execution", input.attemptsExecuted >= 1, "no validation attempt executed"],
    ["variant diversity", input.distinctVariants >= 1, "no distinct validation variant"],
    ["observed evidence", observed.length > 0, "no observed non-inference evidence"],
    ["baseline comparison", input.baselineObserved !== false, "no baseline behavior was established"],
    ["behavior change", input.behaviorChanged !== false, "no meaningful behavior change was established"],
    ["reproducibility", input.reproducible !== false, "result is not reproducible"],
    ["root-cause support", input.rootCauseSupported !== false, "root cause is not sufficiently supported"],
    ["impact", input.expectedImpact !== "none" && input.impactObserved !== false, "security impact was not established"],
  ]

  if (input.evidence.some(x => x.kind === "inference") && observed.length === 0) {
    checks[4][1] = false
    checks[4][2] = "inference-only evidence is insufficient"
  }

  if (input.expectedImpact && input.expectedImpact !== "none" && independent < 1) {
    checks[9][1] = false
    checks[9][2] = "impact needs at least one independent supporting observation"
  }

  if (input.authorizationContextVerified === false) {
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
