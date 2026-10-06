import { loadAgentPlan } from "./agent-plan-store"
import { dispatchPersistedTasks, executeAndRecordDispatchedTask, type PreparedMultiAgentPlan } from "./multi-agent-runtime"
import { NativeCyberStrikeExecutor } from "./native-cyberstrike-executor"
import { finishAgentTask } from "./agent-task-runtime"
import { checkpointPhase } from "./runtime-persistence"
import { coverageGate } from "./ledger"
import { loadTaskStates } from "./task-state-store"
import { updateMission } from "./mission"

export interface NativeDispatchOptions {
  limit?:number
  agentBySkill?:Record<string,string>
  agentByRole?:Record<string,string>
  defaultAgent?:string
  parentSessionID?:string
  model?:{providerID:string;modelID:string}
}

export async function executePersistedDispatchWithNativeCyberStrike(
  root:string,
  target:string,
  options:NativeDispatchOptions={},
){
  const plan=await loadAgentPlan(root,target)
  if(!plan) throw new Error("AGENT_PLAN_NOT_FOUND")
  const prepared:PreparedMultiAgentPlan={
    plan,
    persistedTaskIds:plan.tasks.map(task=>task.id),
    resolvedSkillCount:plan.tasks.reduce((sum,task)=>sum+(task.resolvedSkills?.length??0),0),
  }
  const batchLimit=Math.max(1,options.limit??4)
  const batches=[]
  const results=[]
  const executorOptions={
    agentBySkill:options.agentBySkill,
    agentByRole:options.agentByRole,
    defaultAgent:options.defaultAgent,
    parentSessionID:options.parentSessionID,
    model:options.model,
  }

  while(true){
    const dispatched=await dispatchPersistedTasks(root,prepared,batchLimit)
    batches.push(dispatched)
    if(!dispatched.batch.tasks.length) break

    for(const task of dispatched.batch.tasks){
      const taskResults=[]
      let terminal=false

      for(let attempt=0;attempt<20 && !terminal;attempt++){
        try{
          const result=await executeAndRecordDispatchedTask(
            root,
            plan,
            task.id,
            new NativeCyberStrikeExecutor(executorOptions),
          )
          taskResults.push(result)
          terminal=result.lifecycle?.hypothesisStatus==="confirmed" ||
            result.lifecycle?.hypothesisStatus==="rejected" ||
            result.lifecycle?.hypothesisStatus==="blocked"
        }catch(error){
          try{
            await finishAgentTask(root,target,task.id,"failed")
          }catch{}
          taskResults.push({
            taskId:task.id,
            error:error instanceof Error?error.message:String(error),
          })
          terminal=true
        }
      }

      results.push({
        taskId:task.id,
        attempts:taskResults.length,
        results:taskResults,
      })
    }

    await checkpointPhase(root,target,"tasks:batch-executed")
  }

  const finalTaskState=await loadTaskStates(root,target)
  const terminalTaskIds=new Set(
    finalTaskState.tasks
      .filter(task=>task.state==="completed" || task.state==="blocked" || task.state==="failed")
      .map(task=>task.taskId),
  )
  const allPlannedTasksTerminal=plan.tasks.every(task=>terminalTaskIds.has(task.id))
  const coverage=await coverageGate(root,target)
  const canComplete=allPlannedTasksTerminal && plan.tasks.length>0 && coverage.complete &&
    finalTaskState.tasks.every(task=>task.state==="completed" || task.state==="blocked")

  if(canComplete){
    try{
      await updateMission(root,target,"COMPLETED","tasks:completed")
    }catch{}
  }
  await checkpointPhase(root,target,canComplete ? "tasks:completed" : "tasks:executed")
  return {
    batches,
    results,
    dispatched:batches.at(-1),
    allPlannedTasksTerminal,
    coverage,
    canComplete,
    taskStates:finalTaskState,
  }
}
