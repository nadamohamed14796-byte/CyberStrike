export type EvidenceSource = "observed" | "browser" | "js" | "inferred" | "replay"

export interface RequestNode {
  id: string
  sessionId: string
  method: string
  url: string
  host?: string
  path?: string
  credentialId?: string
  accountLabel?: string
  observedAt: number
  source: EvidenceSource
}

export interface ResponseNode {
  id: string
  requestId: string
  status: number
  headers: Record<string, string>
  contentType?: string
  bodyHash?: string
  observedAt: number
}

export interface JSAssetNode {
  id: string
  url: string
  pageUrl?: string
  sha256?: string
  observedAt: number
}

export interface ParameterNode {
  id: string
  requestId: string
  name: string
  location: "query" | "path" | "body" | "header"
  source: EvidenceSource
  observedAt: number
}

export interface FunctionNode {
  id: string
  name: string
  assetId?: string
  sourceLocation?: string
}

export interface Edge {
  from: string
  to: string
  kind: "loads" | "references" | "calls" | "produces" | "responds-to" | "observed-on" | "triggered-by"
  confidence: number
  evidence: EvidenceSource
}

export interface CorrelationGraph {
  requests: Map<string, RequestNode>
  responses: Map<string, ResponseNode>
  assets: Map<string, JSAssetNode>
  functions: Map<string, FunctionNode>
  parameters: Map<string, ParameterNode>
  edges: Edge[]
}

export function createGraph(): CorrelationGraph {
  return { requests: new Map(), responses: new Map(), assets: new Map(), functions: new Map(), parameters: new Map(), edges: [] }
}

export interface SerializedCorrelationGraph {
  requests: RequestNode[]
  responses: ResponseNode[]
  assets: JSAssetNode[]
  functions: FunctionNode[]
  parameters: ParameterNode[]
  edges: Edge[]
}

export function serializeGraph(graph: CorrelationGraph): SerializedCorrelationGraph {
  return {
    requests: [...graph.requests.values()],
    responses: [...graph.responses.values()],
    assets: [...graph.assets.values()],
    functions: [...graph.functions.values()],
    parameters: [...graph.parameters.values()],
    edges: [...graph.edges],
  }
}

export function hydrateGraph(data: Partial<SerializedCorrelationGraph>): CorrelationGraph {
  const graph = createGraph()
  for (const request of data.requests ?? []) graph.requests.set(request.id, request)
  for (const response of data.responses ?? []) graph.responses.set(response.id, response)
  for (const asset of data.assets ?? []) graph.assets.set(asset.id, asset)
  for (const fn of data.functions ?? []) graph.functions.set(fn.id, fn)
  for (const parameter of data.parameters ?? []) graph.parameters.set(parameter.id, parameter)
  graph.edges.push(...(data.edges ?? []))
  return graph
}

export function dedupeEdges(edges: Edge[]): Edge[] {
  const seen = new Set<string>()
  return edges.filter(edge => {
    const key = [edge.from, edge.to, edge.kind].join("|")
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function addRequest(graph: CorrelationGraph, node: RequestNode): void {
  graph.requests.set(node.id, node)
}

export function addParameter(graph: CorrelationGraph, node: ParameterNode): void {
  if (!graph.requests.has(node.requestId)) throw new Error(`Cannot attach parameter to unknown request: ${node.requestId}`)
  graph.parameters.set(node.id, node)
  graph.edges.push({ from: node.id, to: node.requestId, kind: "observed-on", confidence: 1, evidence: node.source })
}

export function addResponse(graph: CorrelationGraph, node: ResponseNode): void {
  if (!graph.requests.has(node.requestId)) throw new Error(`Cannot attach response to unknown request: ${node.requestId}`)
  graph.responses.set(node.id, node)
  graph.edges.push({ from: node.id, to: node.requestId, kind: "responds-to", confidence: 1, evidence: "observed" })
}

export function link(graph: CorrelationGraph, edge: Edge): void {
  if (edge.confidence < 0 || edge.confidence > 1) throw new Error("confidence must be between 0 and 1")
  graph.edges.push(edge)
}

export function requestEvidence(graph: CorrelationGraph, requestId: string): {
  request: RequestNode
  response?: ResponseNode
  assets: JSAssetNode[]
  functions: FunctionNode[]
  edges: Edge[]
} {
  const request = graph.requests.get(requestId)
  if (!request) throw new Error(`Unknown request: ${requestId}`)
  const related = graph.edges.filter(e => e.from === requestId || e.to === requestId)
  const responseId = related.find(e => e.kind === "responds-to" && e.from !== requestId)?.from
  const assetIds = related.filter(e => e.kind === "observed-on").map(e => e.from)
  const functionIds = related.filter(e => e.kind === "triggered-by").map(e => e.from)
  return {
    request,
    response: responseId ? graph.responses.get(responseId) : undefined,
    assets: assetIds.flatMap(id => { const x = graph.assets.get(id); return x ? [x] : [] }),
    functions: functionIds.flatMap(id => { const x = graph.functions.get(id); return x ? [x] : [] }),
    edges: related,
  }
}
