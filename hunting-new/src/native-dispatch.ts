import { loadAgentPlan } from "./agent-plan-store"
import { dispatchPersistedTasks, executeAndRecordDispatchedTask, type PreparedMultiAgentPlan } from "./multi-agent-runtime"
import { NativeCyberStrikeExecutor } from "./native-cyberstrike-executor"
import { finishAgentTask } from "./agent-task-runtime"
import { checkpointPhase } from "./runtime-persistence"

export interface NativeDispatchOptions {
  limit?:number
  agentBySkill?:Record<string,string>
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
  const dispatched=await dispatchPersistedTasks(root,prepared,Math.max(1,options.limit??4))
  const results=[]
  for(const task of dispatched.batch.tasks){
    try{
      results.push(await executePersistedTaskWithNativeCyberStrike(root,plan,task.id,{
        agentBySkill:options.agentBySkill,
        defaultAgent:options.defaultAgent,
        parentSessionID:options.parentSessionID,
        model:options.model,
      }))
    }catch(error){
      await finishAgentTask(root,target,task.id,"failed")
      results.push({taskId:task.id,error:error instanceof Error?error.message:String(error)})
    }
  }
  await checkpointPhase(root,target,"tasks:executed")
  return {dispatched,results}
}
