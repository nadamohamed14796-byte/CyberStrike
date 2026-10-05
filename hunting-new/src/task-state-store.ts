import path from "node:path"
import { mkdir, rm } from "node:fs/promises"
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

async function withTaskStateLock<T>(root:string,target:string,work:()=>Promise<T>):Promise<T>{
  const lock=path.join(targetDir(root,target),"intelligence","task-state.lock")
  await ensureDir(path.dirname(lock))
  for(let attempt=0;attempt<40;attempt++){
    try{
      await mkdir(lock)
      try{return await work()}finally{await rm(lock,{recursive:true,force:true})}
    }catch(error){
      if((error as NodeJS.ErrnoException).code!=="EEXIST") throw error
      await Bun.sleep(25)
    }
  }
  throw new Error("TASK_STATE_LOCK_TIMEOUT")
}

export async function transitionTaskState(
  root:string,
  target:string,
  taskId:string,
  nextState:TaskStateRecord["state"],
  attempts?:number,
  expectedStates?:TaskStateRecord["state"][],
):Promise<TaskStateRecord>{
  return withTaskStateLock(root,target,async()=>{
    const current=await loadTaskStates(root,target)
    const task=current.tasks.find(x=>x.taskId===taskId)
    if(!task) throw new Error("TASK_NOT_FOUND")
    if(expectedStates && !expectedStates.includes(task.state)) throw new Error(`TASK_STATE_CONFLICT: ${task.state}`)
    const nextRecord:TaskStateRecord={
      taskId,
      state:nextState,
      attempts:attempts===undefined?task.attempts:Math.max(0,attempts),
      updatedAt:new Date().toISOString(),
    }
    const index=current.tasks.findIndex(x=>x.taskId===taskId)
    current.tasks[index]=nextRecord
    const next={...current,updatedAt:new Date().toISOString()}
    await writeJson(file(root,target),next)
    return nextRecord
  })
}

export async function saveTaskState(root: string, target: string, task: TaskStateRecord): Promise<TaskStateStore> {
  return withTaskStateLock(root,target,async()=>{
    const current = await loadTaskStates(root, target)
    const index = current.tasks.findIndex(x => x.taskId === task.taskId)
    if (index === -1) current.tasks.push(task)
    else current.tasks[index] = task
    const next = { ...current, updatedAt: new Date().toISOString() }
    await ensureDir(path.dirname(file(root, target)))
    await writeJson(file(root, target), next)
    return next
  })
}
