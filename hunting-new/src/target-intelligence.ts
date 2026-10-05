import path from "node:path"
import { ensureDir, readJson, writeJson, targetDir } from "./store"
import type { JSAssetNode, RequestNode, ResponseNode } from "./correlation"
import type { HypothesisRecord } from "./hypotheses"

export interface TargetIntelligence {
  target: string
  updatedAt: string
  jsAssets: JSAssetNode[]
  requests: RequestNode[]
  responses: ResponseNode[]
  hypotheses: HypothesisRecord[]
  tags: string[]
}

export function emptyTargetIntelligence(target: string): TargetIntelligence {
  return { target, updatedAt: new Date().toISOString(), jsAssets: [], requests: [], responses: [], hypotheses: [], tags: [] }
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
    jsAssets: mergeById(current.jsAssets, patch.jsAssets ?? []),
    requests: mergeById(current.requests, patch.requests ?? []),
    responses: mergeById(current.responses, patch.responses ?? []),
    hypotheses: mergeById(current.hypotheses, patch.hypotheses ?? []),
    tags: [...new Set([...current.tags, ...(patch.tags ?? [])])],
  })
}
