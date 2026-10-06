import path from "node:path"
import { ensureDir, readJson, targetDir, writeJson, withTargetMutationLock } from "./store"
import type { Attempt } from "./adaptive-attempts"

export interface AttemptState {
  target: string
  attempts: Attempt[]
  updatedAt: string
}

export async function loadAttempts(root: string, target: string): Promise<AttemptState> {
  const file = path.join(targetDir(root, target), "intelligence", "attempts.json")
  return (await readJson<AttemptState | null>(file, null)) ?? {
    target, attempts: [], updatedAt: new Date().toISOString(),
  }
}

export async function saveAttempts(root: string, state: AttemptState): Promise<AttemptState> {
  const dir = path.join(targetDir(root, state.target), "intelligence")
  await ensureDir(dir)
  const next = { ...state, updatedAt: new Date().toISOString() }
  await writeJson(path.join(dir, "attempts.json"), next)
  return next
}

export async function appendAttempt(root: string, target: string, attempt: Attempt): Promise<AttemptState> {
  return withTargetMutationLock(root, target, async () => {
    const state = await loadAttempts(root, target)
    const index = state.attempts.findIndex(x => x.id === attempt.id)
    if (index === -1) state.attempts.push(attempt)
    else state.attempts[index] = attempt
    return saveAttempts(root, state)
  })
}
