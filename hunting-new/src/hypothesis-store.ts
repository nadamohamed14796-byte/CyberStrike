import path from "node:path"
import { ensureDir, readJson, targetDir, writeJson } from "./store"
import type { HypothesisRecord, HypothesisStatus } from "./hypotheses"

export interface HypothesisState {
  target: string
  hypotheses: HypothesisRecord[]
  updatedAt: string
}

export async function loadHypotheses(root: string, target: string): Promise<HypothesisState> {
  const file = path.join(targetDir(root, target), "intelligence", "hypotheses.json")
  return (await readJson<HypothesisState | null>(file, null)) ?? {
    target,
    hypotheses: [],
    updatedAt: new Date().toISOString(),
  }
}

export async function saveHypotheses(root: string, state: HypothesisState): Promise<HypothesisState> {
  const dir = path.join(targetDir(root, state.target), "intelligence")
  await ensureDir(dir)
  const next = { ...state, updatedAt: new Date().toISOString() }
  await writeJson(path.join(dir, "hypotheses.json"), next)
  return next
}

export async function upsertHypothesis(root: string, target: string, hypothesis: HypothesisRecord): Promise<HypothesisState> {
  const state = await loadHypotheses(root, target)
  const index = state.hypotheses.findIndex(x => x.id === hypothesis.id)
  if (index === -1) state.hypotheses.push(hypothesis)
  else state.hypotheses[index] = { ...state.hypotheses[index], ...hypothesis }
  return saveHypotheses(root, state)
}

export async function transitionHypothesis(
  root: string,
  target: string,
  id: string,
  status: HypothesisStatus,
  evidenceIds?: string[],
): Promise<HypothesisRecord> {
  const state = await loadHypotheses(root, target)
  const item = state.hypotheses.find(x => x.id === id)
  if (!item) throw new Error("HYPOTHESIS_NOT_FOUND")
  item.status = status
  if (evidenceIds) item.evidenceIds = [...new Set(evidenceIds)]
  await saveHypotheses(root, state)
  return item
}
