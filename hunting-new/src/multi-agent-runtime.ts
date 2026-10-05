import { buildMultiAgentPlan, type MultiAgentPlan } from "./multi-agent-planner"
import { persistAgentPlan } from "./agent-task-runtime"
import { loadSkillRegistry } from "./skill-registry-loader"
import { saveAgentPlan, loadAgentPlan } from "./agent-plan-store"
import type { SignalEngine, SkillRule } from "./signals"
import type { LearningEngine } from "./learning-engine"
import type { FalsePositiveIntelligence } from "./false-positive-intelligence"

export interface PreparedMultiAgentPlan {
  plan:MultiAgentPlan
  persistedTaskIds:string[]
  resolvedSkillCount:number
}

export async function prepareMultiAgentPlan(
  root:string,
  engine:SignalEngine,
  rules:SkillRule[],
  target:string,
  learning?:LearningEngine,
  falsePositives?:FalsePositiveIntelligence,
):Promise<PreparedMultiAgentPlan>{
  const plan=buildMultiAgentPlan(engine,rules,target,learning,falsePositives)
  const created=await persistAgentPlan(root,plan)
  const registry=await loadSkillRegistry(root)

  for(const task of plan.tasks){
    const resolved=registry.selectForTask(task.skill,[task.signal,...task.strategyHints],task.signalConfidence)
    task.resolvedSkills=resolved.map(skill=>skill.name)
  }

  await saveAgentPlan(root,plan)

  return {
    plan,
    persistedTaskIds:created.map(x=>x.taskId),
    resolvedSkillCount:plan.tasks.reduce((sum,task)=>sum+(task.resolvedSkills?.length??0),0),
  }
}

import { dispatchAgentTasks } from "./multi-agent-planner"
import { loadTaskStates } from "./task-state-store"
import { claimAgentTask, finishAgentTask } from "./agent-task-runtime"
import { checkpointPhase } from "./runtime-persistence"

export async function dispatchPersistedTasks(
  root:string,
  prepared:PreparedMultiAgentPlan,
  limit=4,
){
  const state=await loadTaskStates(root,prepared.plan.target)
  const states=new Map(state.tasks.map(task=>[task.taskId,task.state] as const))
  const batch=dispatchAgentTasks(prepared.plan,states,limit)
  const claimed=[]
  for(const task of batch.tasks){
    claimed.push(await claimAgentTask(root,prepared.plan.target,task.id))
  }
  await checkpointPhase(root,prepared.plan.target,"tasks:dispatched")
  return {batch,claimed}
}

export async function completeDispatchedTask(
  root:string,
  target:string,
  taskId:string,
  state:"completed"|"failed"|"blocked",
){
  const result=await finishAgentTask(root,target,taskId,state)
  await checkpointPhase(root,target,`tasks:${state}`)
  return result
}


export async function resumePersistedDispatch(
  root:string,
  target:string,
  limit=4,
){
  const plan=await loadAgentPlan(root,target)
  if(!plan) throw new Error("AGENT_PLAN_NOT_FOUND")
  const prepared:PreparedMultiAgentPlan={
    plan,
    persistedTaskIds:plan.tasks.map(task=>task.id),
    resolvedSkillCount:plan.tasks.reduce((sum,task)=>sum+(task.resolvedSkills?.length??0),0),
  }
  return dispatchPersistedTasks(root,prepared,limit)
}
\nexport interface AgentTaskExecutionContext {\n  taskId:string\n  target:string\n  primarySkill:string\n  resolvedSkills:string[]\n  strategyHints:string[]\n  signal:string\n  signalConfidence:number\n  reason:string\n}\n\nexport function buildAgentTaskExecutionContext(plan:MultiAgentPlan,taskId:string):AgentTaskExecutionContext{\n  const task=plan.tasks.find(item=>item.id===taskId)\n  if(!task) throw new Error("AGENT_TASK_NOT_FOUND")\n  return { taskId:task.id, target:task.target, primarySkill:task.skill, resolvedSkills:task.resolvedSkills??[task.skill], strategyHints:[...task.strategyHints], signal:task.signal, signalConfidence:task.signalConfidence, reason:task.reason }\n}\n\nexport interface AgentTaskExecutor {\n  execute(context:AgentTaskExecutionContext):Promise<{\n    state:"executed"|"inconclusive"|"blocked"|"rejected"|"confirmed"\n    attemptId?:string\n    requestId?:string\n    resultSummary?:string\n    evidenceIds?:string[]\n  }>\n}\n\nexport async function executeDispatchedTask(root:string,plan:MultiAgentPlan,taskId:string,executor:AgentTaskExecutor){\n  const context=buildAgentTaskExecutionContext(plan,taskId)\n  const result=await executor.execute(context)\n  await checkpointPhase(root,plan.target,"tasks:executor:"+result.state)\n  return {context,result}\n}\n