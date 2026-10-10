import { AttemptLedger, type StrategyClass } from "./adaptive-attempts"
import { type CorrelationGraph } from "./correlation"
import { checkScope, resolveScopeUrl } from "./scope"

export type MissionState = "blocked" | "active" | "paused" | "completed"

export interface Hypothesis {
  id: string
  title: string
  host: string
  path: string
  signal: string
  status: "pending" | "testing" | "confirmed" | "rejected" | "blocked"
}

export interface Mission {
  id: string
  state: MissionState
  scope: string[]
  hypotheses: Hypothesis[]
}

export interface OrchestratorContext {
  mission: Mission
  graph: CorrelationGraph
  attempts: AttemptLedger
}

export interface DispatchDecision {
  hypothesisId: string
  action: "test" | "skip"
  reason: string
  strategy?: StrategyClass
}

const STRATEGIES: StrategyClass[] = [
  "parameter", "encoding", "method", "content-type", "request-shape",
  "account-context", "identifier", "path", "header", "workflow", "parser", "alternate-client",
]

export function dispatch(ctx: OrchestratorContext, hypothesis: Hypothesis): DispatchDecision {
  if (ctx.mission.state !== "active") return { hypothesisId: hypothesis.id, action: "skip", reason: `mission is ${ctx.mission.state}` }
  if (hypothesis.status !== "pending" && hypothesis.status !== "testing") return { hypothesisId: hypothesis.id, action: "skip", reason: `hypothesis is ${hypothesis.status}` }

  const scopedUrl = resolveScopeUrl(hypothesis.host, hypothesis.path)
  const scope = scopedUrl ? checkScope(scopedUrl, ctx.mission.scope.map(value => ({ value }))) : { allowed: false, normalized: "", reason: "invalid-hypothesis-url" }
  if (!scope.allowed) return { hypothesisId: hypothesis.id, action: "skip", reason: `scope gate rejected target: ${scope.reason}` }

  const used = new Set(ctx.attempts.list(hypothesis.id).map(a => a.strategy))
  const strategy = STRATEGIES.find(s => !used.has(s))
  if (!strategy) return { hypothesisId: hypothesis.id, action: "skip", reason: "all strategy classes exhausted" }

  return { hypothesisId: hypothesis.id, action: "test", strategy, reason: `signal-driven strategy selection for ${hypothesis.signal}` }
}

export function completionState(mission: Mission, pendingRelevantItems: number): MissionState {
  if (mission.state === "blocked") return "blocked"
  if (pendingRelevantItems > 0) return mission.state === "paused" ? "paused" : "active"
  return "completed"
}
