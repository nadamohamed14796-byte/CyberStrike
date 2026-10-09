import path from "node:path"
import { ensureDir, readJson, targetDir, writeJson, withTargetMutationLock } from "./store"
import type { FindingRecord } from "./findings"

export interface FindingState {
  target: string
  findings: FindingRecord[]
  updatedAt: string
}

export async function loadFindings(root: string, target: string): Promise<FindingState> {
  const file = path.join(targetDir(root, target), "intelligence", "findings.json")
  return (await readJson<FindingState | null>(file, null)) ?? { target, findings: [], updatedAt: new Date().toISOString() }
}

export async function saveFindings(root: string, state: FindingState): Promise<FindingState> {
  const dir = path.join(targetDir(root, state.target), "intelligence")
  await ensureDir(dir)
  const next = { ...state, updatedAt: new Date().toISOString() }
  await writeJson(path.join(dir, "findings.json"), next)
  return next
}

export async function upsertFinding(root: string, target: string, finding: FindingRecord): Promise<FindingState> {
  return withTargetMutationLock(root, target, async () => {
    const state = await loadFindings(root, target)
    const index = state.findings.findIndex(x => x.fingerprint === finding.fingerprint)
    if (index === -1) state.findings.push(finding)
    else state.findings[index] = finding
    return saveFindings(root, state)
  })
}
