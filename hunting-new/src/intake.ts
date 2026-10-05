import { addRequest, addResponse, link, type CorrelationGraph, type RequestNode, type ResponseNode } from "./correlation"
import { rememberTargetIntelligence } from "./target-intelligence"

export interface NetworkObservation {
  sessionId: string
  request: { id: string; method: string; url: string; host?: string; path?: string; credentialId?: string; accountLabel?: string; observedAt?: number }
  response?: { id: string; status: number; headers?: Record<string,string>; contentType?: string; bodyHash?: string; observedAt?: number }
  jsAssetIds?: string[]
  functionIds?: string[]
}

export async function ingestAndPersistObservation(root: string, target: string, graph: CorrelationGraph, observation: NetworkObservation): Promise<void> {
  ingestObservation(graph, observation)
  const response = observation.response
  await rememberTargetIntelligence(root, target, {
    requests: [graph.requests.get(observation.request.id)!],
    responses: response ? [graph.responses.get(response.id)!] : [],
    jsAssets: [],
    hypotheses: [],
    tags: [],
  })
}

export function ingestObservation(graph: CorrelationGraph, observation: NetworkObservation): void {
  const r = observation.request
  const request: RequestNode = {
    ...r,
    sessionId: observation.sessionId,
    observedAt: r.observedAt ?? Date.now(),
    source: "observed",
  }
  addRequest(graph, request)

  if (observation.response) {
    const p = observation.response
    const response: ResponseNode = {
      ...p,
      requestId: r.id,
      headers: p.headers ?? {},
      observedAt: p.observedAt ?? Date.now(),
    }
    addResponse(graph, response)
  }

  for (const assetId of observation.jsAssetIds ?? []) {
    link(graph, { from: assetId, to: r.id, kind: "observed-on", confidence: 1, evidence: "browser" })
  }
  for (const functionId of observation.functionIds ?? []) {
    link(graph, { from: functionId, to: r.id, kind: "triggered-by", confidence: 1, evidence: "browser" })
  }
}
