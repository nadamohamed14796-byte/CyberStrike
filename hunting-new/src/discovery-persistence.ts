import type { CorrelationGraph } from "./correlation"
import type { JSAsset, JSRequest } from "./js"
import { rememberTargetIntelligence, stableRequestId } from "./target-intelligence"

export interface PersistDiscoveryInput {
  target: string
  graph: CorrelationGraph
  assets: JSAsset[]
  requests: JSRequest[]
  tags?: string[]
}

export async function persistDiscovery(root: string, input: PersistDiscoveryInput) {
  const graphRequests = [...input.graph.requests.values()]
  const graphResponses = [...input.graph.responses.values()]
  const graphAssets = [...input.graph.assets.values()]
  const graphFunctions = [...input.graph.functions.values()]

  return rememberTargetIntelligence(root, input.target, {
    tags: input.tags ?? [],
    jsAssets: [
      ...graphAssets,
      ...input.assets.map(asset => ({
        ...(input.graph.assets.get(asset.js_asset_id) ?? {}),
        id: asset.js_asset_id,
        url: asset.url,
        sha256: asset.content_hash,
        observedAt: Date.now(),
      })),
    ],
    requests: [
      ...graphRequests,
      ...input.requests.map(request => ({
        id: stableRequestId(request.method, request.endpoint),
        sessionId: "js-analysis",
        method: request.method,
        url: request.endpoint,
        observedAt: Date.now(),
        source: "js" as const,
      })),
    ],
    responses: graphResponses,
    functions: graphFunctions,
    edges: input.graph.edges,
  })
}

