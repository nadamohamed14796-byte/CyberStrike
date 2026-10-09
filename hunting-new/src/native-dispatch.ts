import { loadAgentPlan } from "./agent-plan-store"
import { dispatchPersistedTasks, executeAndRecordDispatchedTask, prepareAgentTaskValidation, type PreparedMultiAgentPlan } from "./multi-agent-runtime"
import { recordAttemptLifecycle } from "./attempt-lifecycle"
import { NativeCyberStrikeExecutor } from "./native-cyberstrike-executor"
import { checkpointPhase } from "./runtime-persistence"
import { coverageGate } from "./ledger"
import { loadTaskStates } from "./task-state-store"
import { updateMission } from "./mission"
import { loadPolicies } from "./policy"

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
  const policies=await loadPolicies(root)
  const batchLimit=Math.max(1,options.limit??4)
  const batches=[]
  const results=[]
  const executorOptions={
    agentBySkill:options.agentBySkill,
    agentByRole:options.agentByRole,
    defaultAgent:options.defaultAgent,
    parentSessionID:options.parentSessionID,
    model:options.model,
    root,
  }

  while(true){
    const dispatched=await dispatchPersistedTasks(root,prepared,batchLimit)
    batches.push(dispatched)
    if(!dispatched.batch.tasks.length) break

    for(const task of dispatched.batch.tasks){
      const taskResults=[]
      let terminal=false

      for(let attempt=0;attempt<policies.validation.default_attempt_budget && !terminal;attempt++){
        try{
          const result=await executeAndRecordDispatchedTask(
            root,
            plan,
            task.id,
            new NativeCyberStrikeExecutor(executorOptions),
          )
          taskResults.push(result)
          const eligible=result.lifecycle?.validation?.decision==="eligible"
          const promotionResolved=!eligible || Boolean(result.promotion?.reportable) || result.promotion?.action==="skip"
          terminal=result.lifecycle?.hypothesisStatus==="blocked" ||
            result.lifecycle?.hypothesisStatus==="rejected" ||
            (result.lifecycle?.hypothesisStatus==="confirmed" && promotionResolved)
        }catch(error){
          const message=error instanceof Error?error.message:String(error)
          let lifecycle
          try{
            const preparedAttempt=await prepareAgentTaskValidation(root,plan,task.id)
            lifecycle=await recordAttemptLifecycle(
              root,target,preparedAttempt.attempt.id,{
                state:"inconclusive",
                resultSummary:"Executor error: "+message,
                evidenceIds:[],
                skill:task.skill,
                endpoint:preparedAttempt.hypothesis.endpoint,
                confidence:preparedAttempt.hypothesis.confidence,
                taskId:task.id,
              },
            )
          }catch{}
          taskResults.push({
            taskId:task.id,
            error:message,
            lifecycle,
          })
          terminal=lifecycle?.hypothesisStatus==="blocked" ||
            lifecycle?.hypothesisStatus==="rejected" ||
            (lifecycle?.hypothesisStatus==="confirmed" && lifecycle.validation?.decision==="eligible")
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
