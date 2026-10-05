import type { MultiAgentPlan } from "./multi-agent-planner"
import { loadTaskStates, saveTaskState } from "./task-state-store"
import type { TaskStateRecord } from "./task-state"

export async function persistAgentPlan(root: string, plan: MultiAgentPlan): Promise<TaskStateRecord[]> {
  const current = await loadTaskStates(root, plan.target)
  const existing = new Set(current.tasks.map(x => x.taskId))
  const now = new Date().toISOString()
  const created: TaskStateRecord[] = []

  for (const task of plan.tasks) {
    if (existing.has(task.id)) continue
    const record: TaskStateRecord = {
      taskId: task.id,
      state: "pending",
      attempts: 0,
      updatedAt: now,
    }
    await saveTaskState(root, plan.target, record)
    created.push(record)
  }

  return created
}

export async function setAgentTaskState(
  root: string,
  target: string,
  taskId: string,
  state: TaskStateRecord["state"],
  attempts = 0,
): Promise<TaskStateRecord> {
  const record: TaskStateRecord = {
    taskId,
    state,
    attempts: Math.max(0, attempts),
    updatedAt: new Date().toISOString(),
  }
  await saveTaskState(root, target, record)
  return record
}
