import type { MultiAgentPlan } from "./multi-agent-planner"
import { loadTaskStates, saveTaskState, transitionTaskState } from "./task-state-store"
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

export async function claimAgentTask(
  root: string,
  target: string,
  taskId: string,
): Promise<TaskStateRecord> {
  const current = await loadTaskStates(root, target)
  const task = current.tasks.find(x => x.taskId === taskId)
  if (!task) throw new Error("TASK_NOT_FOUND")
  if (task.state !== "pending" && task.state !== "claimed") {
    throw new Error(`TASK_NOT_CLAIMABLE: ${task.state}`)
  }

  return transitionTaskState(root,target,taskId,"running",task.attempts+1,["pending","claimed"])
}

export async function finishAgentTask(
  root: string,
  target: string,
  taskId: string,
  state: "completed" | "failed" | "blocked",
): Promise<TaskStateRecord> {
  const current = await loadTaskStates(root, target)
  const task = current.tasks.find(x => x.taskId === taskId)
  if (!task) throw new Error("TASK_NOT_FOUND")
  if (task.state !== "running" && task.state !== "claimed") {
    throw new Error(`TASK_NOT_FINISHABLE: ${task.state}`)
  }

  return setAgentTaskState(root, target, taskId, state, task.attempts)
}
