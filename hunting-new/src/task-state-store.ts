import path from "node:path"
import { ensureDir, readJson, targetDir, writeJson } from "./store"
import type { TaskStateRecord } from "./task-state"

export interface TaskStateStore {
  target: string
  tasks: TaskStateRecord[]
  updatedAt: string
}

function file(root: string, target: string) {
  return path.join(targetDir(root, target), "intelligence", "task-state.json")
}

export async function loadTaskStates(root: string, target: string): Promise<TaskStateStore> {
  return (await readJson<TaskStateStore | null>(file(root, target), null)) ?? {
    target,
    tasks: [],
    updatedAt: new Date().toISOString(),
  }
}

export async function saveTaskState(root: string, target: string, task: TaskStateRecord): Promise<TaskStateStore> {
  const current = await loadTaskStates(root, target)
  const index = current.tasks.findIndex(x => x.taskId === task.taskId)
  if (index === -1) current.tasks.push(task)
  else current.tasks[index] = task
  const next = { ...current, updatedAt: new Date().toISOString() }
  await ensureDir(path.dirname(file(root, target)))
  await writeJson(file(root, target), next)
  return next
}
