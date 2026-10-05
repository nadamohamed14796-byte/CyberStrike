import path from "node:path"
import { ensureDir, readJson, targetDir, writeJson } from "./store"
import type { EvidenceRecord } from "./evidence"
import { mergeEvidence } from "./evidence"

export interface EvidenceState {
  target: string
  evidence: EvidenceRecord[]
  updatedAt: string
}

export async function loadEvidence(root: string, target: string): Promise<EvidenceState> {
  const file = path.join(targetDir(root, target), "intelligence", "evidence.json")
  return (await readJson<EvidenceState | null>(file, null)) ?? { target, evidence: [], updatedAt: new Date().toISOString() }
}

export async function saveEvidence(root: string, state: EvidenceState): Promise<EvidenceState> {
  const dir = path.join(targetDir(root, state.target), "intelligence")
  await ensureDir(dir)
  const next = { ...state, evidence: mergeEvidence(state.evidence), updatedAt: new Date().toISOString() }
  await writeJson(path.join(dir, "evidence.json"), next)
  return next
}

export async function appendEvidence(root: string, target: string, evidence: EvidenceRecord): Promise<EvidenceState> {
  const state = await loadEvidence(root, target)
  return saveEvidence(root, { ...state, evidence: [...state.evidence, evidence] })
}
