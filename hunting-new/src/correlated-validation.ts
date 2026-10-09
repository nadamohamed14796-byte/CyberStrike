import type { CorrelationGraph } from "./correlation"
import type { AccountContextRegistry } from "./account-context"
import type { HypothesisRecord } from "./hypotheses"
import { createValidationRun, evaluateValidationRun } from "./validation-runner"
import type { ValidationEvidence } from "./validation-gate"

export interface CorrelatedValidationContext {
  hypothesisId: string
  accountLabels: string[]
  requestIds: string[]
  responseIds: string[]
  jsAssetIds: string[]
  functionIds: string[]
}

export function buildValidationContext(graph: CorrelationGraph, accounts: AccountContextRegistry, hypothesis: HypothesisRecord): CorrelatedValidationContext {
  const requestIds = [...graph.requests.values()].filter(r => r.host === hypothesis.target || r.url.includes(hypothesis.target)).map(r => r.id)
  const requestSet = new Set(requestIds)
  const responseIds = [...graph.responses.values()].filter(r => requestSet.has(r.requestId)).map(r => r.id)
  const edges = graph.edges.filter(e => requestSet.has(e.from) || requestSet.has(e.to))
  const jsAssetIds = [...graph.assets.keys()].filter(id => edges.some(e => e.from === id || e.to === id))
  const functionIds = [...graph.functions.keys()].filter(id => edges.some(e => e.from === id || e.to === id))
  return { hypothesisId: hypothesis.id, accountLabels: accounts.labels(), requestIds, responseIds, jsAssetIds, functionIds }
}

export function prepareCorrelatedRun(graph: CorrelationGraph, accounts: AccountContextRegistry, hypothesis: HypothesisRecord) {
  const context = buildValidationContext(graph, accounts, hypothesis)
  const run = createValidationRun(hypothesis)
  return { context, ...run }
}

export function evaluateCorrelatedRun(hypothesis: HypothesisRecord, ledger: ReturnType<typeof createValidationRun>["ledger"], evidence: ValidationEvidence[]) {
  return evaluateValidationRun(hypothesis, ledger, evidence)
}
