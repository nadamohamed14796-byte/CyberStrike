import { AttemptLedger, type AttemptPolicy, type Attempt, type AttemptStrategy } from "./adaptive-attempts"
import { validateHypothesis, type ValidationEvidence } from "./validation-gate"
import type { HypothesisRecord } from "./hypotheses"

export interface ValidationPlan {
  hypothesisId: string
  strategies: AttemptStrategy[]
  maxAttempts: number
}

export interface ValidationRunState {
  hypothesisId: string
  attempts: Attempt[]
  evidence: ValidationEvidence[]
  decision: "continue" | "eligible" | "blocked"
  reasons: string[]
}

const DEFAULT_STRATEGIES: AttemptStrategy[] = [
  "parameter", "encoding", "method", "content-type",
  "request-shape", "account-context", "identifier",
  "path", "header", "workflow", "parser", "alternate-client",
]

export function createValidationPlan(hypothesis: HypothesisRecord, policy: Partial<AttemptPolicy> = {}): ValidationPlan {
  const maxAttempts = Math.min(policy.maxAttempts ?? 20, 20)
  return { hypothesisId: hypothesis.id, strategies: DEFAULT_STRATEGIES.slice(0, maxAttempts), maxAttempts }
}

export function createValidationRun(hypothesis: HypothesisRecord, policy: Partial<AttemptPolicy> = {}) {
  return {
    ledger: new AttemptLedger({ ...policy, maxAttempts: Math.min(policy.maxAttempts ?? 20, 20) }),
    plan: createValidationPlan(hypothesis, policy),
  }
}

export function evaluateValidationRun(hypothesis: HypothesisRecord, ledger: AttemptLedger, evidence: ValidationEvidence[]): ValidationRunState {
  const attempts = ledger.list()
  const executed = attempts.filter(x => x.state === "executed" || x.state === "confirmed").length
  const variants = new Set(attempts.map(x => x.strategy + ":" + (x.resultSummary ?? ""))).size
  const result = validateHypothesis({
    hypothesisId: hypothesis.id, inScope: true, attemptsExecuted: executed,
    distinctVariants: variants, evidence, expectedImpact: "medium",
  })
  if (result.decision === "eligible") return { hypothesisId: hypothesis.id, attempts, evidence, decision: "eligible", reasons: result.reasons }
  if (attempts.length >= 20) return { hypothesisId: hypothesis.id, attempts, evidence, decision: "blocked", reasons: [...result.reasons, "maximum bounded attempts reached"] }
  return { hypothesisId: hypothesis.id, attempts, evidence, decision: "continue", reasons: result.reasons }
}
