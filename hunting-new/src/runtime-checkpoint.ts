import path from "node:path"
import { appendEvent, ensureDir, readJson, targetDir, writeJson } from "./store"
import type { MissionState } from "./mission"

export interface RuntimeCheckpoint {
  target: string
  missionState: MissionState
  phase: string
  activeHypothesisIds: string[]
  activeChainIds: string[]
  completedAttemptIds: string[]
  updatedAt: string
}

export async function loadCheckpoint(root: string, target: string): Promise<RuntimeCheckpoint | null> {
  return readJson<RuntimeCheckpoint | null>(
    path.join(targetDir(root, target), "intelligence", "checkpoint.json"),
    null,
  )
}

export async function saveCheckpoint(
  root: string,
  checkpoint: Omit<RuntimeCheckpoint, "updatedAt">,
): Promise<RuntimeCheckpoint> {
  const dir = path.join(targetDir(root, checkpoint.target), "intelligence")
  await ensureDir(dir)
  const next = { ...checkpoint, updatedAt: new Date().toISOString() }
  await writeJson(path.join(dir, "checkpoint.json"), next)
  await appendEvent(root, checkpoint.target, {
    type: "runtime.checkpoint",
    phase: checkpoint.phase,
    missionState: checkpoint.missionState,
    activeHypothesisIds: checkpoint.activeHypothesisIds,
    activeChainIds: checkpoint.activeChainIds,
    completedAttemptIds: checkpoint.completedAttemptIds,
    timestamp: next.updatedAt,
  })
  return next
}
