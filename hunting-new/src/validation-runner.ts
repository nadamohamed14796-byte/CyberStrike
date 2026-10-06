import { AttemptLedger, type AttemptPolicy, type Attempt, type StrategyClass } from "./adaptive-attempts"
import { validateHypothesis, type ValidationEvidence } from "./validation-gate"
import type { HypothesisRecord } from "./hypotheses"
import type { LearningEngine } from "./learning-engine"
import type { FalsePositiveIntelligence } from "./false-positive-intelligence"

export interface ValidationPlan {
  hypothesisId: string
  strategies: StrategyClass[]
  variants: Array<{ strategy: StrategyClass; variant: string }>
  maxAttempts: number
}

export interface ValidationRunState {
  hypothesisId: string
  attempts: Attempt[]
  evidence: ValidationEvidence[]
  decision: "continue" | "eligible" | "blocked"
  reasons: string[]
}

const DEFAULT_STRATEGIES: StrategyClass[] = [
  "parameter", "encoding", "method", "content-type",
  "request-shape", "account-context", "identifier",
  "path", "header", "workflow", "parser", "alternate-client",
]

const DEFAULT_VARIANTS: Array<{ strategy: StrategyClass; variant: string }> = [
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

const SIGNAL_STRATEGY_ORDER:Record<string, StrategyClass[]>={
  object_identifier_detected:["account-context","identifier","parameter","request-shape","method","encoding","header","path","workflow","parser","alternate-client","content-type"],
  authenticated_endpoint:["account-context","parameter","request-shape","method","header","identifier","workflow","encoding","path","parser","alternate-client","content-type"],
  javascript_function_request_correlation:["parameter","request-shape","encoding","parser","path","method","header","workflow","identifier","content-type","alternate-client","account-context"],
  waf_signal_detected:["encoding","parameter","request-shape","content-type","parser","alternate-client","header","method","path","workflow","identifier","account-context"],
  rate_limit_detected:["header","method","request-shape","alternate-client","workflow","parameter","path","encoding","content-type","parser","identifier","account-context"],
  graphql_detected:["request-shape","parameter","method","content-type","parser","encoding","header","path","workflow","alternate-client","identifier","account-context"],
  redirect_parameter_detected:["parameter","encoding","path","header","request-shape","method","parser","alternate-client","workflow","content-type","identifier","account-context"],
  source_map_detected:["parameter","parser","request-shape","path","header","encoding","method","content-type","workflow","alternate-client","identifier","account-context"],
  api_method_mismatch:["method","request-shape","parameter","content-type","parser","alternate-client","header","path","workflow","encoding","identifier","account-context"],
}

function rankStrategiesForHypothesis(hypothesis:HypothesisRecord, variants:Array<{strategy:StrategyClass;variant:string}>):Array<{strategy:StrategyClass;variant:string}>{
  const preferred=SIGNAL_STRATEGY_ORDER[hypothesis.signal]
  if(!preferred)return variants
  const rank=new Map(preferred.map((strategy,index)=>[strategy,index]))
  return [...variants].sort((a,b)=>
    (rank.get(a.strategy)??preferred.length)-(rank.get(b.strategy)??preferred.length) ||
    a.variant.localeCompare(b.variant)
  )
}

export function rankValidationVariants(
  hypothesis: HypothesisRecord,
  variants: Array<{ strategy: StrategyClass; variant: string }>,
  learning?: LearningEngine,
  falsePositives?: FalsePositiveIntelligence,
  target?: string,
): Array<{ strategy: StrategyClass; variant: string }> {
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
  const signalRanked = rankStrategiesForHypothesis(hypothesis, DEFAULT_VARIANTS)
  const variants = rankValidationVariants(hypothesis, signalRanked, learning, falsePositives, target).slice(0, maxAttempts)
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
