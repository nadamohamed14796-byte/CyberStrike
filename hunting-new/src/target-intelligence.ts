import path from "node:path"
import { ensureDir, readJson, writeJson, targetDir, withTargetMutationLock } from "./store"
import type { JSAssetNode, RequestNode, ResponseNode, FunctionNode, ParameterNode, Edge } from "./correlation"
import type { HypothesisRecord } from "./hypotheses"
import { dedupeEdges } from "./correlation"
import { dedupeAssetRelations, type AssetRelation } from "./cross-host-graph"
import type { ApiSource } from "./api-diff"

export interface ParameterCandidate {
  id: string
  name: string
  location: "path" | "query" | "body"
  endpoint: string
  requestIds: string[]
  sources: Array<"observed" | "js" | "tool">
  confidence: number
  firstSeen: number
  lastSeen: number
}

export interface TargetAccount {
  id: string
  label: string
  authenticationState: "anonymous" | "authenticated"
  credentialFingerprint?: string
  firstSeen: number
  lastSeen: number
}

export interface TargetIntelligence {
  target: string
  updatedAt: string
  accounts: TargetAccount[]
  parameters: ParameterCandidate[]
  assetRelations: AssetRelation[]
  jsAssets: JSAssetNode[]
  requests: RequestNode[]
  responses: ResponseNode[]
  functions: FunctionNode[]
  edges: Edge[]
  hypotheses: HypothesisRecord[]
  tags: string[]
  apiSources: ApiSource[]
}

export function emptyTargetIntelligence(target: string): TargetIntelligence {
  return { target, updatedAt: new Date().toISOString(), accounts: [], parameters: [], assetRelations: [], jsAssets: [], requests: [], responses: [], functions: [], edges: [], hypotheses: [], tags: [], apiSources: [] }
}

export function accountForRequest(request: RequestNode): TargetAccount | undefined {
  if (!request.credentialId && !request.accountLabel) return undefined
  const id = request.credentialId ?? "account:" + (request.accountLabel ?? "authenticated")
  const label = request.accountLabel ?? id
  return {
    id,
    label,
    authenticationState: "authenticated",
    firstSeen: request.observedAt,
    lastSeen: request.observedAt,
  }
}

export function requestsForAccount(state: TargetIntelligence, accountId: string): RequestNode[] {
  return state.requests.filter(request =>
    request.credentialId === accountId ||
    accountForRequest(request)?.id === accountId,
  )
}

export function sharedEndpointAccounts(state: TargetIntelligence): Map<string, string[]> {
  const result = new Map<string, Set<string>>()
  for (const request of state.requests) {
    const account = accountForRequest(request)
    if (!account) continue
    const endpoint = request.path ?? request.url
    const accounts = result.get(endpoint) ?? new Set<string>()
    accounts.add(account.id)
    result.set(endpoint, accounts)
  }
  return new Map([...result.entries()].map(([endpoint, accounts]) => [endpoint, [...accounts]]))
}

export function discoverRequestParameters(request: RequestNode): ParameterCandidate[] {
  const endpoint = request.path ?? request.url
  const now = request.observedAt
  const found = new Map<string, ParameterCandidate>()
  const add = (name: string, location: ParameterCandidate["location"], confidence: number) => {
    const clean = name.trim()
    if (!clean || clean.length > 128 || /[\s<>"'{}]/.test(clean)) return
    const id = "param_" + Bun.hash(endpoint + "|" + location + "|" + clean).toString(16)
    const previous = found.get(id)
    found.set(id, {
      id, name: clean, location, endpoint,
      requestIds: [...new Set([...(previous?.requestIds ?? []), request.id])],
      sources: [...new Set<ParameterCandidate["sources"][number]>([...(previous?.sources ?? []), "observed"])],
      confidence: Math.max(previous?.confidence ?? 0, confidence),
      firstSeen: Math.min(previous?.firstSeen ?? now, now),
      lastSeen: Math.max(previous?.lastSeen ?? now, now),
    })
  }
  try {
    const parsed = new URL(request.url)
    for (const key of parsed.searchParams.keys()) add(key, "query", 0.95)
  } catch {}
  for (const match of endpoint.matchAll(/(?:^|[/:])\{([^}]+)\}/g)) add(match[1], "path", 0.82)
  const raw = (request as RequestNode & { rawRequest?: string }).rawRequest
  if (raw) {
    const body = raw.split(/\r?\n\r?\n/, 2)[1] ?? ""
    if (body) {
      for (const key of body.matchAll(/["']([A-Za-z_][A-Za-z0-9_.-]{0,127})["']\s*:/g)) add(key[1], "body", 0.72)
    }
  }
  return [...found.values()]
}

export function stableRequestId(method: string, url: string): string {
  return "req_" + Bun.hash(method.trim().toUpperCase() + "|" + url.trim()).toString(16)
}

function mergeAccounts(current:TargetAccount[],incoming:TargetAccount[]):TargetAccount[]{
  const map=new Map(current.map(item=>[item.id,item]))
  for(const item of incoming){
    const previous=map.get(item.id)
    if(!previous){
      map.set(item.id,{...item})
      continue
    }
    map.set(item.id,{
      ...previous,
      ...item,
      firstSeen:Math.min(previous.firstSeen,item.firstSeen),
      lastSeen:Math.max(previous.lastSeen,item.lastSeen),
      authenticationState:previous.authenticationState==="authenticated" || item.authenticationState==="authenticated"
        ? "authenticated"
        : "anonymous",
    })
  }
  return [...map.values()]
}

function mergeParameters(current:ParameterCandidate[],incoming:ParameterCandidate[]):ParameterCandidate[]{
  const map=new Map(current.map(item=>[item.id,item]))
  for(const item of incoming){
    const previous=map.get(item.id)
    if(!previous){ map.set(item.id,{...item,requestIds:[...new Set(item.requestIds)],sources:[...new Set(item.sources)]}); continue }
    map.set(item.id,{
      ...previous,...item,
      requestIds:[...new Set([...previous.requestIds,...item.requestIds])],
      sources:[...new Set([...previous.sources,...item.sources])],
      confidence:Math.max(previous.confidence,item.confidence),
      firstSeen:Math.min(previous.firstSeen,item.firstSeen),
      lastSeen:Math.max(previous.lastSeen,item.lastSeen),
    })
  }
  return [...map.values()]
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const map = new Map(current.map(x => [x.id, x]))
  for (const item of incoming) map.set(item.id, item)
  return [...map.values()]
}

export async function loadTargetIntelligence(root: string, target: string): Promise<TargetIntelligence> {
  const file = path.join(targetDir(root, target), "intelligence", "target.json")
  return (await readJson<TargetIntelligence | null>(file, null)) ?? emptyTargetIntelligence(target)
}

export async function saveTargetIntelligence(root: string, state: TargetIntelligence): Promise<TargetIntelligence> {
  const dir = path.join(targetDir(root, state.target), "intelligence")
  await ensureDir(dir)
  const next: TargetIntelligence = { ...state, updatedAt: new Date().toISOString() }
  await writeJson(path.join(dir, "target.json"), next)
  return next
}

export async function rememberTargetIntelligence(
  root: string,
  target: string,
  patch: Partial<Omit<TargetIntelligence, "target" | "updatedAt">>,
): Promise<TargetIntelligence> {
  return withTargetMutationLock(root, target, async () => {
    const current = await loadTargetIntelligence(root, target)
    return saveTargetIntelligence(root, {
      ...current,
      accounts: mergeAccounts(current.accounts ?? [], patch.accounts ?? []),
      parameters: mergeParameters(current.parameters ?? [], patch.parameters ?? []),
      assetRelations: dedupeAssetRelations([...(current.assetRelations ?? []), ...(patch.assetRelations ?? [])]),
      jsAssets: mergeById(current.jsAssets, patch.jsAssets ?? []),
      requests: mergeById(current.requests, patch.requests ?? []),
      responses: mergeById(current.responses, patch.responses ?? []),
      functions: mergeById(current.functions, patch.functions ?? []),
      edges: dedupeEdges([...current.edges, ...(patch.edges ?? [])]),
      hypotheses: mergeById(current.hypotheses, patch.hypotheses ?? []),
      tags: [...new Set([...current.tags, ...(patch.tags ?? [])])],
      apiSources: [...new Map(
        [...(current.apiSources ?? []), ...(patch.apiSources ?? [])]
          .map(item=>[`${item.source}|${item.method.toUpperCase()}|${item.endpoint}`,item] as const),
      ).values()],
    })
  })
}
