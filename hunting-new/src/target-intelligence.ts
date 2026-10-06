import path from "node:path"
import { ensureDir, readJson, writeJson, targetDir } from "./store"
import type { JSAssetNode, RequestNode, ResponseNode, FunctionNode, Edge } from "./correlation"
import type { HypothesisRecord } from "./hypotheses"
import { dedupeEdges } from "./correlation"

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
  jsAssets: JSAssetNode[]
  requests: RequestNode[]
  responses: ResponseNode[]
  functions: FunctionNode[]
  edges: Edge[]
  hypotheses: HypothesisRecord[]
  tags: string[]
}

export function emptyTargetIntelligence(target: string): TargetIntelligence {
  return { target, updatedAt: new Date().toISOString(), accounts: [], jsAssets: [], requests: [], responses: [], functions: [], edges: [], hypotheses: [], tags: [] }
}

export function stableRequestId(method: string, url: string): string {
  return "req_" + Bun.hash(method.trim().toUpperCase() + "|" + url.trim()).toString(16)
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
  const current = await loadTargetIntelligence(root, target)
  return saveTargetIntelligence(root, {
    ...current,
    accounts: mergeById(current.accounts ?? [], patch.accounts ?? []).map(item => ({ ...item })),
    jsAssets: mergeById(current.jsAssets, patch.jsAssets ?? []),
    requests: mergeById(current.requests, patch.requests ?? []),
    responses: mergeById(current.responses, patch.responses ?? []),
    functions: mergeById(current.functions, patch.functions ?? []),
    edges: dedupeEdges([...current.edges, ...(patch.edges ?? [])]),
    hypotheses: mergeById(current.hypotheses, patch.hypotheses ?? []),
    tags: [...new Set([...current.tags, ...(patch.tags ?? [])])],
  })
}
