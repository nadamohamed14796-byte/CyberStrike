import path from "node:path"
import { ensureDir, readJson, targetDir, writeJson, withTargetMutationLock } from "./store"
import { FalsePositiveIntelligence, type FalsePositiveRecord } from "./false-positive-intelligence"

export interface FalsePositiveState {
  target: string
  records: FalsePositiveRecord[]
  updatedAt: string
}

export async function loadFalsePositives(root: string, target: string): Promise<FalsePositiveState> {
  const file = path.join(targetDir(root, target), "intelligence", "false-positives.json")
  return (await readJson<FalsePositiveState | null>(file, null)) ?? {
    target,
    records: [],
    updatedAt: new Date().toISOString(),
  }
}

export async function saveFalsePositives(root: string, state: FalsePositiveState): Promise<FalsePositiveState> {
  const dir = path.join(targetDir(root, state.target), "intelligence")
  await ensureDir(dir)
  const next = { ...state, updatedAt: new Date().toISOString() }
  await writeJson(path.join(dir, "false-positives.json"), next)
  return next
}

export async function recordFalsePositive(root: string, target: string, record: FalsePositiveRecord): Promise<FalsePositiveState> {
  return withTargetMutationLock(root, target, async () => {
    const state = await loadFalsePositives(root, target)
    const index = state.records.findIndex(x => x.fingerprint === record.fingerprint)
    if (index === -1) state.records.push(record)
    else state.records[index] = record
    return saveFalsePositives(root, state)
  })
}

export function hydrateFalsePositiveIntelligence(state: FalsePositiveState): FalsePositiveIntelligence {
  const intelligence = new FalsePositiveIntelligence()
  for (const record of state.records) intelligence.record(record)
  return intelligence
}
