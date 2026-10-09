import type { MultiAgentPlan } from "./multi-agent-planner"
import { loadTaskStates, saveTaskState, transitionTaskState } from "./task-state-store"
import type { TaskStateRecord } from "./task-state"
import { loadPolicies } from "./policy"

export async function persistAgentPlan(root: string, plan: MultiAgentPlan): Promise<TaskStateRecord[]> {
  const current = await loadTaskStates(root, plan.target)
  const policies = await loadPolicies(root)
  const existing = new Set(current.tasks.map(x => x.taskId))
  const newTaskCount = plan.tasks.filter(task => !existing.has(task.id)).length
  if (current.tasks.length + newTaskCount > policies.context.max_task_records) {
    throw new Error(`TASK_RECORD_LIMIT: plan needs ${current.tasks.length + newTaskCount} records; policy limit is ${policies.context.max_task_records}. Existing records were preserved.`)
  }
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

  return transitionTaskState(root,target,taskId,state,task.attempts,["running","claimed"])
}

export async function recoverStaleAgentTasks(
  root:string,
  target:string,
  maxAgeMs=30*60*1000,
):Promise<TaskStateRecord[]>{
  const current=await loadTaskStates(root,target)
  const cutoff=Date.now()-Math.max(1000,maxAgeMs)
  const recovered:TaskStateRecord[]=[]
  for(const task of current.tasks){
    if(task.state!=="running" && task.state!=="claimed") continue
    if(Date.parse(task.updatedAt)>cutoff) continue
    recovered.push(
      await transitionTaskState(
        root,target,task.taskId,"pending",task.attempts,["running","claimed"],
      ),
    )
  }
  return recovered
}

