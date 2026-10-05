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
    const taskResults=[]
    let terminal=false
    for(let attempt=0;attempt<20 && !terminal;attempt++){
      try{
        const result=await executeAndRecordDispatchedTask(root,plan,task.id,new NativeCyberStrikeExecutor({
          agentBySkill:options.agentBySkill,
          defaultAgent:options.defaultAgent,
          parentSessionID:options.parentSessionID,
          model:options.model,
        }))
        taskResults.push(result)
        terminal=result.lifecycle?.hypothesisStatus==="confirmed" ||
          result.lifecycle?.hypothesisStatus==="rejected" ||
          result.lifecycle?.hypothesisStatus==="blocked"
      }catch(error){
        if(attempt===0) await finishAgentTask(root,target,task.id,"failed")
        taskResults.push({taskId:task.id,error:error instanceof Error?error.message:String(error)})
        terminal=true
      }
    }
    results.push({taskId:task.id,attempts:taskResults.length,results:taskResults})
  }
  await checkpointPhase(root,target,"tasks:executed")
  return {dispatched,results}
}
