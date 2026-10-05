import { addRequest, link, type CorrelationGraph } from "./correlation"
import type { JSAsset, JSRequest } from "./js"

export interface CorrelationInput {
  asset: JSAsset
  requests: JSRequest[]
  observedRequestIds: string[]
}

export function correlateJSRequests(graph: CorrelationGraph, input: CorrelationInput): void {
  graph.assets.set(input.asset.js_asset_id, {
    id: input.asset.js_asset_id,
    url: input.asset.url,
    sha256: input.asset.content_hash,
    observedAt: Date.now(),
  })

  for (const [index, jsRequest] of input.requests.entries()) {
    const id = `js-${input.asset.js_asset_id}-${index + 1}`
    addRequest(graph, {
      id,
      sessionId: "js-analysis",
      method: jsRequest.method,
      url: jsRequest.endpoint,
      observedAt: Date.now(),
      source: "js",
    })
    link(graph, {
      from: id,
      to: input.asset.js_asset_id,
      kind: "references",
      confidence: jsRequest.confidence,
      evidence: "js",
    })
  }

  for (const requestId of input.observedRequestIds) {
    link(graph, {
      from: input.asset.js_asset_id,
      to: requestId,
      kind: "observed-on",
      confidence: 0.9,
      evidence: "browser",
    })
  }
}
