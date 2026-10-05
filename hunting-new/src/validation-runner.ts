import { AttemptLedger, type AttemptPolicy, type Attempt, type AttemptStrategy } from "./adaptive-attempts"
import { validateHypothesis, type ValidationEvidence } from "./validation-gate"
import type { HypothesisRecord } from "./hypotheses"
import type { LearningEngine } from "./learning-engine"
import type { FalsePositiveIntelligence } from "./false-positive-intelligence"

export interface ValidationPlan {
  hypothesisId: string
  strategies: AttemptStrategy[]
  variants: Array<{ strategy: AttemptStrategy; variant: string }>
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

const DEFAULT_VARIANTS: Array<{ strategy: AttemptStrategy; variant: string }> = [
  ...DEFAULT_STRATEGIES.map(strategy => ({ strategy, variant: "baseline" })),
  { strategy: "parameter", variant: "duplicate-parameter" },
  { strategy: "encoding", variant: "mixed-encoding" },
  { strategy: "method", variant: "alternate-safe-method" },
  { strategy: "request-shape", variant: "minimal-body" },
  { strategy: "account-context", variant: "same-account-control" },
  { strategy: "identifier", variant: "adjacent-identifier" },
  { strategy: "header", variant: "header-variation" },
  { strategy: "workflow", variant: "replayed-step" },
]

export function rankValidationVariants(
  hypothesis: HypothesisRecord,
  variants: Array<{ strategy: AttemptStrategy; variant: string }>,
  learning?: LearningEngine,
  falsePositives?: FalsePositiveIntelligence,
  target?: string,
): Array<{ strategy: AttemptStrategy; variant: string }> {
  if (!learning || !target) return variants
  const scores = learning.score(target)
  return [...variants].sort((a,b) => {
    const score = (item: typeof a) => {
      const learned = scores
        .filter(x => x.key.startsWith(hypothesis.signal + "|") && x.key.split("|")[2] === item.strategy)
        .reduce((best,x) => Math.max(best,x.utility), 0)
      const fp = falsePositives?.list(target)
        .filter(x => x.signal === hypothesis.signal && x.strategy === item.strategy)
        .reduce((sum,x) => sum + Math.min(.75, .05*x.count), 0) ?? 0
      return learned - fp
    }
    return score(b) - score(a)
  })
}

export function createValidationPlan(hypothesis: HypothesisRecord, policy: Partial<AttemptPolicy> = {}, learning?: LearningEngine, falsePositives?: FalsePositiveIntelligence, target?: string): ValidationPlan {
  const maxAttempts = Math.min(policy.maxAttempts ?? 20, 20)
  const variants = rankValidationVariants(hypothesis, DEFAULT_VARIANTS, learning, falsePositives, target).slice(0, maxAttempts)
  return {
    hypothesisId: hypothesis.id,
    strategies: variants.map(x => x.strategy),
    variants,
    maxAttempts,
  }
}

export function createValidationRun(hypothesis: HypothesisRecord, policy: Partial<AttemptPolicy> = {}, learning?: LearningEngine, falsePositives?: FalsePositiveIntelligence, target?: string) {
  const maxAttempts = Math.min(policy.maxAttempts ?? 20, 20)
  return {
    ledger: new AttemptLedger({ ...policy, maxAttempts }),
    plan: createValidationPlan(hypothesis, { ...policy, maxAttempts }, learning, falsePositives, target),
  }
}

export function evaluateValidationRun(
  hypothesis: HypothesisRecord,
  ledger: AttemptLedger,
  evidence: ValidationEvidence[],
): ValidationRunState {
  const attempts = ledger.list(hypothesis.id)
  const executed = attempts.filter(x => x.state === "executed" || x.state === "confirmed").length
  const variants = new Set(attempts.map(x => x.strategy + ":" + x.variant)).size
  const result = validateHypothesis({
    hypothesisId: hypothesis.id,
    inScope: true,
    attemptsExecuted: executed,
    evidence,
    distinctVariants: variants,
    expectedImpact: "medium",
  })
  if (result.decision === "eligible") {
    return { hypothesisId: hypothesis.id, attempts, evidence, decision: "eligible", reasons: result.reasons }
  }
  if (attempts.length >= 20) {
    return { hypothesisId: hypothesis.id, attempts, evidence, decision: "blocked", reasons: [...result.reasons, "maximum bounded attempts reached"] }
  }
  return { hypothesisId: hypothesis.id, attempts, evidence, decision: "continue", reasons: result.reasons }
}
