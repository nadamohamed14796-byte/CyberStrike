import { buildMultiAgentPlan, type MultiAgentPlan } from "./multi-agent-planner"
import { recordAttemptLifecycle, type AttemptLifecycleResult } from "./attempt-lifecycle"
import { persistAgentPlan } from "./agent-task-runtime"
import { loadSkillRegistry } from "./skill-registry-loader"
import { saveAgentPlan, loadAgentPlan } from "./agent-plan-store"
import type { SignalEngine, SkillRule } from "./signals"
import type { LearningEngine } from "./learning-engine"
import type { FalsePositiveIntelligence } from "./false-positive-intelligence"
import { upsertHypothesis } from "./hypothesis-store"
import type { HypothesisRecord } from "./hypotheses"
import { PersistentAttemptLedger } from "./persistent-attempt-ledger"
import type { Attempt, StrategyClass } from "./adaptive-attempts"
import { createValidationPlan } from "./validation-runner"
import { loadHypotheses } from "./hypothesis-store"
import { checkpointPhase } from "./runtime-persistence"

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

export interface PreparedTaskValidation {
  hypothesis: HypothesisRecord
  attempt: Attempt
}

function strategyForTask(task: AgentTaskExecutionContext): StrategyClass {
  const value=(task.signal+" "+task.primarySkill+" "+task.strategyHints.join(" ")).toLowerCase()
  if(/waf|firewall|filter|blocked|403/.test(value)) return "encoding"
  if(/idor|authorization|access|auth|tenant/.test(value)) return "account-context"
  if(/api|graphql|rest|endpoint/.test(value)) return "request-shape"
  if(/jwt|token/.test(value)) return "header"
  if(/redirect|oauth/.test(value)) return "parameter"
  if(/upload|file/.test(value)) return "content-type"
  if(/js|javascript|source|bundle/.test(value)) return "parser"
  return "parameter"
}

export async function prepareAgentTaskValidation(
  root:string,
  plan:MultiAgentPlan,
  taskId:string,
):Promise<PreparedTaskValidation>{
  const context=buildAgentTaskExecutionContext(plan,taskId)
  const hypothesisId="hyp_"+Bun.hash([
    context.signal,
    context.target,
    context.endpoint??"",
    context.functionId??"",
  ].join("|")).toString(16)
  const storedHypotheses=await loadHypotheses(root,plan.target)
  const existing=storedHypotheses.hypotheses.find(x=>x.id===hypothesisId)
  const hypothesis:HypothesisRecord=existing ?? {
    id:hypothesisId,
    title:`${context.signal} signal requires validation`,
    signal:context.signal,
    target:context.target,
    endpoint:context.endpoint,
    functionId:context.functionId,
    confidence:context.signalConfidence,
    status:"pending",
    evidenceIds:[],
    createdAt:new Date().toISOString(),
  }
  if(!existing) await upsertHypothesis(root,plan.target,hypothesis)
  const ledger=await PersistentAttemptLedger.create(root,plan.target,{maxAttempts:20,minimumAttempts:20})
  const used=new Set(ledger.list(hypothesis.id).map(x=>x.strategy+":"+x.variant))
  const next=createValidationPlan(hypothesis,{maxAttempts:20,minimumAttempts:20}).variants.find(x=>!used.has(x.strategy+":"+x.variant))
  if(!next) throw new Error("VALIDATION_ATTEMPT_BUDGET_EXHAUSTED")
  const attempt=await ledger.plan(
    hypothesis.id,
    next.strategy,
    next.variant,
    `signal=${context.signal}; skill=${context.primarySkill}; strategy=${next.strategy}; variant=${next.variant}`,
  )
  if(!attempt) throw new Error("VALIDATION_ATTEMPT_UNAVAILABLE")
  return {hypothesis,attempt}
}

export interface AgentTaskExecutionContext {
  taskId:string
  target:string
  primarySkill:string
  resolvedSkills:string[]
  strategyHints:string[]
  signal:string
  signalConfidence:number
  endpoint?:string
  functionId?:string
  attemptId?:string
  reason:string
}

export function buildAgentTaskExecutionContext(plan:MultiAgentPlan,taskId:string):AgentTaskExecutionContext{
  const task=plan.tasks.find(item=>item.id===taskId)
  if(!task) throw new Error("AGENT_TASK_NOT_FOUND")
  return { taskId:task.id, target:task.target, primarySkill:task.skill, resolvedSkills:task.resolvedSkills??[task.skill], strategyHints:[...task.strategyHints], signal:task.signal, signalConfidence:task.signalConfidence, endpoint:task.endpoint, functionId:task.functionId, reason:task.reason }
}

export interface AgentTaskExecutor {
  execute(context:AgentTaskExecutionContext):Promise<{
    state:"executed"|"inconclusive"|"blocked"|"rejected"|"confirmed"
    attemptId?:string
    requestId?:string
    resultSummary?:string
    evidenceIds?:string[]
  }>
}

export async function executeDispatchedTask(
  root:string,
  plan:MultiAgentPlan,
  taskId:string,
  executor:AgentTaskExecutor,
){
  return executeAndRecordDispatchedTask(root,plan,taskId,executor)
}

export async function executeAndRecordDispatchedTask(
  root:string,
  plan:MultiAgentPlan,
  taskId:string,
  executor:AgentTaskExecutor,
):Promise<{context:AgentTaskExecutionContext; result:Awaited<ReturnType<AgentTaskExecutor["execute"]>>; lifecycle?:AttemptLifecycleResult}>{
  const prepared=await prepareAgentTaskValidation(root,plan,taskId)
  const context={...buildAgentTaskExecutionContext(plan,taskId),attemptId:prepared.attempt.id}
  const result=await executor.execute(context)
  const attemptId=result.attemptId??prepared.attempt.id

  const lifecycle=await recordAttemptLifecycle(
    root,
    plan.target,
    attemptId,
    {
      state:result.state,
      requestId:result.requestId,
      resultSummary:result.resultSummary,
      evidenceIds:result.evidenceIds,
      skill:context.primarySkill,
      confidence:context.signalConfidence,
      taskId:context.taskId,
    },
  )

  return {context,result,lifecycle}
}
