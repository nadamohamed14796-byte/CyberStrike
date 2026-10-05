import path from "node:path"
import { ensureDir, readJson, writeJson, targetDir } from "./store"
import type { LearningObservation, LearningScore } from "./learning-engine"

export interface LearningState {
  target: string
  observations: LearningObservation[]
  updatedAt: string
}

export async function loadLearning(root: string, target: string): Promise<LearningState> {
  const file = path.join(targetDir(root, target), "intelligence", "learning.json")
  return (await readJson<LearningState | null>(file, null)) ?? {
    target,
    observations: [],
    updatedAt: new Date().toISOString(),
  }
}

export async function saveLearning(root: string, state: LearningState): Promise<LearningState> {
  const dir = path.join(targetDir(root, state.target), "intelligence")
  await ensureDir(dir)
  const next = { ...state, updatedAt: new Date().toISOString() }
  await writeJson(path.join(dir, "learning.json"), next)
  return next
}

export async function recordLearning(
  root: string,
  target: string,
  observation: LearningObservation,
): Promise<LearningState> {
  const current = await loadLearning(root, target)
  const duplicate = current.observations.some(x =>
    x.signal === observation.signal &&
    x.skill === observation.skill &&
    x.strategy === observation.strategy &&
    x.outcome === observation.outcome &&
    x.target === observation.target &&
    x.timestamp === observation.timestamp
  )
  if (!duplicate) current.observations.push(observation)
  return saveLearning(root, current)
}

export function topScores(state: LearningState): LearningScore[] {
  const groups = new Map<string, LearningObservation[]>()
  for (const item of state.observations) {
    const key = `${item.signal}|${item.skill}|${item.strategy}`
    const group = groups.get(key) ?? []
    group.push(item)
    groups.set(key, group)
  }
  return [...groups.entries()].map(([key, items]) => ({
    key,
    observations: items.length,
    useful: items.filter(x => x.outcome === "useful").length,
    falsePositives: items.filter(x => x.outcome === "false_positive").length,
    confirmed: items.filter(x => x.outcome === "confirmed").length,
    falsePositiveRate: items.filter(x => x.outcome === "false_positive").length / items.length,
    utility: (
      items.filter(x => x.outcome === "confirmed").length +
      items.filter(x => x.outcome === "useful").length * .6 -
      items.filter(x => x.outcome === "false_positive").length * .8
    ) / items.length,
  })).sort((a, b) => b.utility - a.utility)
}
