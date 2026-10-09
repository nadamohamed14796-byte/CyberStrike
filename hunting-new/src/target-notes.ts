import path from "node:path"
import { ensureDir, targetDir, writeJson } from "./store"
import { loadTargetIntelligence } from "./target-intelligence"

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))]
}

function hostOf(value?: string): string {
  if (!value) return "unknown-host"
  try { return new URL(value).hostname.toLowerCase() } catch { return value.toLowerCase() }
}

function safe(value: unknown): string {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ").trim()
}

/** Rebuild readable target notes from canonical structured intelligence. */
export async function renderTargetNotes(root: string, target: string): Promise<string> {
  const state = await loadTargetIntelligence(root, target)
  const requests = state.requests ?? []
  const responses = state.responses ?? []
  const assets = state.jsAssets ?? []
  const functions = state.functions ?? []
  const edges = state.edges ?? []
  const params = state.parameters ?? []
  const relations = state.assetRelations ?? []
  const responseByRequest = new Map(responses.map(item => [item.requestId, item]))
  const requestsByHost = new Map<string, typeof requests>()
  for (const request of requests) {
    const host = request.host ?? hostOf(request.url)
    const list = requestsByHost.get(host) ?? []
    list.push(request)
    requestsByHost.set(host, list)
  }

  const hosts = unique([
    ...requests.map(item => item.host ?? hostOf(item.url)),
    ...assets.map(item => hostOf(item.url)),
    ...relations.map(item => item.toHost),
  ]).sort()

  const lines: string[] = [
    "# Target Knowledge Notes", "",
    "- Target: " + state.target,
    "- Last structured update: " + state.updatedAt,
    "- Generated: " + new Date().toISOString(),
    "- Source of truth: intelligence/target.json",
    "- Evidence rule: distinguish observed facts from inferred relationships.", "",
    "## Executive Summary", "",
    "- Observed request records: " + requests.length,
    "- JavaScript assets: " + assets.length,
    "- Extracted functions: " + functions.length,
    "- Tracked parameters: " + params.length,
    "- Relationship edges: " + edges.length,
    "- Related hosts: " + hosts.length, "",
    "## Asset and Subdomain Map", "",
  ]

  if (!hosts.length) lines.push("_No hosts observed yet._", "")
  for (const host of hosts) {
    const requestCount = requests.filter(item => (item.host ?? hostOf(item.url)) === host).length
    const jsCount = assets.filter(item => hostOf(item.url) === host).length
    const relation = relations.find(item => item.toHost === host)
    lines.push("- **" + safe(host) + "** — requests: " + requestCount + "; JS assets: " + jsCount +
      "; relation: " + safe(relation?.kind ?? "observed") + "; scope: " + safe(relation?.scope ?? "not classified") +
      "; source: " + safe(relation?.source ?? "request/asset observations"))
  }

  lines.push("", "## JavaScript Assets", "")
  if (!assets.length) lines.push("_No JavaScript assets have been correlated yet._", "")
  for (const asset of assets) {
    const assetFunctions = functions.filter(fn => fn.assetId === asset.id)
    const assetEdges = edges.filter(edge => edge.from === asset.id || edge.to === asset.id)
    lines.push("### " + safe(asset.url), "")
    lines.push("- Asset ID: " + asset.id)
    if (asset.pageUrl) lines.push("- Page context: " + safe(asset.pageUrl))
    if (asset.sha256) lines.push("- SHA-256: " + asset.sha256)
    lines.push("- Functions linked: " + (assetFunctions.length ? assetFunctions.map(fn => safe(fn.name)).join(", ") : "none recorded"))
    lines.push("- Graph edges: " + assetEdges.length, "")
  }

  lines.push("## Functions and Endpoint Relationships", "")
  if (!functions.length) lines.push("_No extracted application functions have been recorded yet._", "")
  for (const fn of functions) {
    const related = edges.filter(edge => edge.from === fn.id || edge.to === fn.id)
    const linkedRequests = unique(related.flatMap(edge => {
      const id = edge.from === fn.id ? edge.to : edge.from
      const request = requests.find(item => item.id === id)
      return request ? [request.method + " " + (request.path ?? request.url)] : []
    }))
    lines.push("- **" + safe(fn.name) + "** (" + fn.id + ")")
    if (fn.assetId) lines.push("  - JavaScript asset: " + fn.assetId)
    if (fn.sourceLocation) lines.push("  - Source location: " + safe(fn.sourceLocation))
    lines.push("  - Correlated requests: " + (linkedRequests.length ? linkedRequests.map(safe).join(", ") : "not yet correlated"))
    lines.push("  - Relationship evidence: " + (related.length ? unique(related.map(edge => edge.kind + " (" + edge.evidence + ", confidence " + edge.confidence + ")")).join("; ") : "none"))
  }

  lines.push("", "## Observed Endpoints", "")
  if (!requests.length) lines.push("_No browser/proxy requests have been recorded yet._", "")
  for (const [host, hostRequests] of [...requestsByHost.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push("### " + safe(host), "")
    for (const request of hostRequests.sort((a, b) => b.observedAt - a.observedAt)) {
      const response = responseByRequest.get(request.id)
      lines.push("#### " + safe(request.method.toUpperCase() + " " + (request.path ?? request.url)), "")
      lines.push("- Request ID: " + request.id)
      lines.push("- Observation timestamp: " + request.observedAt)
      lines.push("- Account context: " + safe(request.accountLabel ?? request.credentialId ?? "unknown"))
      lines.push("- Request header names: " + (request.headerNames?.length ? unique(request.headerNames).map(safe).join(", ") : "not captured"))
      lines.push("- Cookie names: " + (request.cookieNames?.length ? unique(request.cookieNames).map(safe).join(", ") : "not captured"))
      lines.push("- Observed parameters: " + (params.filter(param => param.requestIds.includes(request.id)).map(param => param.name + " (" + param.location + ")").join(", ") || "none extracted"))
      lines.push("- Response: " + (response ? response.status + (response.contentType ? "; " + safe(response.contentType) : "") : "not recorded"))
      lines.push("- Response header names: " + (response?.headers ? Object.keys(response.headers).join(", ") : "not captured"), "")
    }
  }

  lines.push("## Cross-Asset Relationships", "")
  if (!relations.length && !edges.length) lines.push("_No explicit cross-asset relationships recorded yet._", "")
  for (const relation of relations) {
    lines.push("- " + relation.fromTarget + " -> **" + safe(relation.toHost) + "** — " + relation.kind +
      "; scope=" + relation.scope + "; confidence=" + relation.confidence + "; source=" + safe(relation.source))
  }
  for (const edge of edges) {
    lines.push("- " + edge.from + " -> " + edge.to + " — " + edge.kind +
      "; evidence=" + edge.evidence + "; confidence=" + edge.confidence)
  }

  lines.push("", "## Parameters", "")
  if (!params.length) lines.push("_No parameters have been extracted yet._", "")
  for (const param of params) {
    lines.push("- **" + safe(param.name) + "** (" + safe(param.location) + ") on " + safe(param.endpoint) +
      " — confidence " + param.confidence + "; sources " + param.sources.join(", ") +
      "; request IDs " + param.requestIds.map(safe).join(", "))
  }

  lines.push("", "## Hypotheses and Validation", "")
  if (!state.hypotheses.length) lines.push("_No vulnerability hypotheses are recorded in the target knowledge store._", "")
  for (const hypothesis of state.hypotheses) {
    lines.push("- **" + safe(hypothesis.title ?? hypothesis.id) + "** — status: " + safe(hypothesis.status) + "; ID: " + hypothesis.id)
  }

  lines.push("", "## Data Quality and Next Knowledge Gaps", "")
  if (!assets.length) lines.push("- Discover and parse JavaScript assets, then persist function-to-endpoint evidence.")
  if (requests.length && !functions.length) lines.push("- Correlate observed endpoints with functions discovered in JavaScript bundles.")
  if (requests.some(item => !item.headerNames?.length)) lines.push("- Request header names are missing for one or more observations; capture names only, never secret values.")
  if (requests.some(item => !item.cookieNames?.length)) lines.push("- Cookie names are missing for one or more observations; capture names only, never cookie values.")
  if (!relations.length) lines.push("- Build cross-host relationships from scope-validated request, JavaScript, and redirect evidence.")
  if (assets.length && !edges.some(edge => edge.kind === "calls" || edge.kind === "produces")) lines.push("- No JS function-to-endpoint call edges are present yet; do not infer them from matching names alone.")
  lines.push("", "_This notebook is regenerated from stored observations. It is not proof of a vulnerability; unconfirmed relationships remain labeled as such._", "")

  const markdown = lines.join("\n")
  const dir = targetDir(root, target)
  await ensureDir(dir)
  await Bun.write(path.join(dir, "target-notes.md"), markdown)
  await writeJson(path.join(dir, "target-notes.meta.json"), {
    target: state.target,
    generatedAt: new Date().toISOString(),
    sourceUpdatedAt: state.updatedAt,
    counts: { requests: requests.length, assets: assets.length, functions: functions.length, parameters: params.length, edges: edges.length, relatedHosts: hosts.length },
  })
  return markdown
}
