import { buildMultiAgentPlan, buildMultiAgentPlanFromRegistry, type MultiAgentPlan } from "./multi-agent-planner"
import { recordAttemptLifecycle, type AttemptLifecycleResult } from "./attempt-lifecycle"
import { persistAgentPlan, recoverStaleAgentTasks } from "./agent-task-runtime"
import { loadSkillRegistry } from "./skill-registry-loader"
import { saveAgentPlan, loadAgentPlan } from "./agent-plan-store"
import { signalEngineFromCorrelation, type SignalEngine, type SkillRule } from "./signals"
import type { LearningEngine } from "./learning-engine"
import type { FalsePositiveIntelligence } from "./false-positive-intelligence"
import { upsertHypothesis, loadHypotheses } from "./hypothesis-store"
import { loadTargetIntelligence } from "./target-intelligence"
import type { HypothesisRecord } from "./hypotheses"
import { PersistentAttemptLedger } from "./persistent-attempt-ledger"
import type { Attempt } from "./adaptive-attempts"
import { createValidationPlan } from "./validation-runner"
import { checkpointPhase } from "./runtime-persistence"
import { buildSkillExecutionInvocation, type SkillExecutionAdapterOptions, type SkillExecutionInvocation } from "./skill-execution-adapter"
import { loadLearning } from "./learning-store"
import { LearningEngine } from "./learning-engine"
import { loadFalsePositives, hydrateFalsePositiveIntelligence } from "./false-positive-store"
import { parseExecutionResult, verifiedEvidenceIds } from "./execution-result"
import { loadMission } from "./mission"
import { checkScope } from "./scope"
import { promoteValidatedHypothesis, type FindingPromotionResult } from "./finding-promotion"

export interface PreparedMultiAgentPlan {
  plan:MultiAgentPlan
  persistedTaskIds:string[]
  resolvedSkillCount:number
}

export async function prepareMultiAgentPlanFromTargetIntelligence(
  root:string,
  target:string,
  learning?:LearningEngine,
  falsePositives?:FalsePositiveIntelligence,
):Promise<PreparedMultiAgentPlan>{
  const intelligence=await loadTargetIntelligence(root,target)
  const engine=signalEngineFromCorrelation({
    target,
    requests:intelligence.requests,
    responses:intelligence.responses,
    jsAssets:intelligence.jsAssets,
    functions:intelligence.functions,
    edges:intelligence.edges,
  })
  const registry=await loadSkillRegistry(root)
  const persistedLearning=learning ?? LearningEngine.fromObservations((await loadLearning(root,target)).observations)
  const persistedFalsePositives=falsePositives ?? hydrateFalsePositiveIntelligence(await loadFalsePositives(root,target))
  const plan=buildMultiAgentPlanFromRegistry(engine,registry,target,persistedLearning,persistedFalsePositives)
  const created=await persistAgentPlan(root,plan)

  for(const task of plan.tasks){
    const resolved=registry.selectForTask(
      task.skill,
      [task.signal,...task.strategyHints],
      task.signalConfidence,
    )
    task.resolvedSkills=resolved.map(skill=>skill.name)
    task.resolvedSkillPaths=resolved.map(skill=>skill.source_path).filter((value):value is string=>Boolean(value))
  }

  await saveAgentPlan(root,plan)
  await checkpointPhase(root,target,"agent-plan:prepared")

  return {
    plan,
    persistedTaskIds:created.map(x=>x.taskId),
    resolvedSkillCount:plan.tasks.reduce((sum,task)=>sum+(task.resolvedSkills?.length??0),0),
  }
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
  await recoverStaleAgentTasks(root,prepared.plan.target)
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
  const intelligence=await loadTargetIntelligence(root,plan.target)
  const correlated=intelligence.requests.filter(request => {
    if(context.endpoint && request.path) return request.path===context.endpoint || request.url.includes(context.endpoint)
    return true
  }).sort((a,b)=>b.observedAt-a.observedAt)[0]
  const correlatedResponse=correlated ? intelligence.responses.find(response=>response.requestId===correlated.id) : undefined
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
  const learningState=await loadLearning(root,plan.target)
  const learningEngine=LearningEngine.fromObservations(learningState.observations)
  const falsePositiveState=await loadFalsePositives(root,plan.target)
  const falsePositiveIntelligence=hydrateFalsePositiveIntelligence(falsePositiveState)
  const validationPlan=createValidationPlan(
    hypothesis,
    {maxAttempts:20,minimumAttempts:20},
    learningEngine,
    falsePositiveIntelligence,
    plan.target,
  )
  const next=validationPlan.variants.find(x=>!used.has(x.strategy+":"+x.variant))
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
  role?:import("./multi-agent-planner").HuntingAgentRole
  primarySkill:string
  resolvedSkills:string[]
  resolvedSkillPaths?:string[]
  strategyHints:string[]
  signal:string
  signalConfidence:number
  endpoint?:string
  functionId?:string
  requestId?:string
  responseId?:string
  jsAssetIds?:string[]
  functionIds?:string[]
  accountLabel?:string
  attemptId?:string
  reason:string
}

export async function enrichAgentTaskExecutionContext(
  root:string,
  plan:MultiAgentPlan,
  context:AgentTaskExecutionContext,
):Promise<AgentTaskExecutionContext>{
  const intelligence=await loadTargetIntelligence(root,plan.target)
  const exact=context.requestId
    ? intelligence.requests.find(request=>request.id===context.requestId)
    : undefined
  const candidates=intelligence.requests.filter(request=>{
    if(context.endpoint && request.path) return request.path===context.endpoint || request.url.includes(context.endpoint)
    return true
  }).sort((a,b)=>b.observedAt-a.observedAt)
  const request=exact ?? candidates[0]
  const response=request ? intelligence.responses.find(item=>item.requestId===request.id) : undefined
  const relatedEdges=request
    ? intelligence.edges.filter(edge=>edge.from===request.id || edge.to===request.id)
    : []
  const functionIds=new Set<string>()
  const jsAssetIds=new Set<string>()
  for(const edge of relatedEdges){
    if(edge.kind==="triggered-by") functionIds.add(edge.from)
    if(edge.kind==="observed-on") jsAssetIds.add(edge.from)
  }
  if(context.functionId) functionIds.add(context.functionId)
  return {
    ...context,
    requestId:request?.id,
    responseId:response?.id,
    accountLabel:request?.accountLabel,
    functionIds:[...functionIds],
    jsAssetIds:[...jsAssetIds],
  }
}

export function buildAgentTaskExecutionContext(plan:MultiAgentPlan,taskId:string):AgentTaskExecutionContext{
  const task=plan.tasks.find(item=>item.id===taskId)
  if(!task) throw new Error("AGENT_TASK_NOT_FOUND")
  return { taskId:task.id, target:task.target, role:task.role, primarySkill:task.skill, resolvedSkills:task.resolvedSkills??[task.skill], resolvedSkillPaths:task.resolvedSkillPaths, strategyHints:[...task.strategyHints], signal:task.signal, signalConfidence:task.signalConfidence, requestId:task.requestId, endpoint:task.endpoint, functionId:task.functionId, reason:task.reason }
}

export async function prepareSkillExecutionInvocation(
  root:string,
  plan:MultiAgentPlan,
  taskId:string,
  options:SkillExecutionAdapterOptions={},
):Promise<SkillExecutionInvocation>{
  const prepared=await prepareAgentTaskValidation(root,plan,taskId)
  const base={...buildAgentTaskExecutionContext(plan,taskId),attemptId:prepared.attempt.id}
  const context=await enrichAgentTaskExecutionContext(root,plan,base)
  return buildSkillExecutionInvocation(context,options)
}

export interface AgentTaskExecutor {
  execute(context:AgentTaskExecutionContext):Promise<{
    state:"executed"|"inconclusive"|"blocked"|"rejected"|"confirmed"
    attemptId?:string
    requestId?:string
    responseId?:string
    resultSummary?:string
    resultText?:string
    evidenceIds?:string[]
  }>
}

export async function prepareDispatchedTaskInvocation(
  root:string,
  plan:MultiAgentPlan,
  taskId:string,
  options:SkillExecutionAdapterOptions={},
):Promise<SkillExecutionInvocation>{
  const prepared=await prepareAgentTaskValidation(root,plan,taskId)
  const baseContext={...buildAgentTaskExecutionContext(plan,taskId),attemptId:prepared.attempt.id}
  const context=await enrichAgentTaskExecutionContext(root,plan,baseContext)
  return buildSkillExecutionInvocation(context,options)
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
):Promise<{context:AgentTaskExecutionContext; result:Awaited<ReturnType<AgentTaskExecutor["execute"]>>; lifecycle?:AttemptLifecycleResult; promotion?:FindingPromotionResult}>{
  const base=buildAgentTaskExecutionContext(plan,taskId)
  const mission=await loadMission(root,plan.target)
  if(!mission) throw new Error("MISSION_NOT_FOUND")
  const initialScope=checkScope(plan.target,mission.scope)
  if(!initialScope.allowed) throw new Error("VALIDATION_SCOPE_BLOCKED: "+initialScope.reason)

  const prepared=await prepareAgentTaskValidation(root,plan,taskId)
  const baseContext={...base,attemptId:prepared.attempt.id}
  const context=await enrichAgentTaskExecutionContext(root,plan,baseContext)

  const intelligence=await loadTargetIntelligence(root,plan.target)
  const exactRequest=context.requestId
    ? intelligence.requests.find(item=>item.id===context.requestId)
    : undefined
  const activeScopeTarget=exactRequest?.url ?? plan.target
  const activeScope=checkScope(activeScopeTarget,mission.scope)
  if(!activeScope.allowed){
    const lifecycle=await recordAttemptLifecycle(
      root,
      plan.target,
      prepared.attempt.id,
      {
        state:"blocked",
        evidenceIds:[],
        skill:context.primarySkill,
        endpoint:context.endpoint,
        confidence:context.signalConfidence,
        taskId:context.taskId,
        resultSummary:"Active scope re-check blocked validation: "+activeScope.reason,
      },
    )
    return {
      context,
      result:{
        state:"blocked",
        attemptId:prepared.attempt.id,
        requestId:context.requestId,
        resultSummary:"Active scope re-check blocked validation: "+activeScope.reason,
        resultText:"scope_blocked",
      },
      lifecycle,
    }
  }

  const result=await executor.execute(context)
  const parsed=result.resultText
    ? parseExecutionResult(result.resultText,{state:result.state,outcome:"clean"})
    : undefined
  const effectiveState=parsed?.state ?? result.state
  const attemptId=result.attemptId??prepared.attempt.id
  const evidenceState=await (await import("./evidence-store")).loadEvidence(root,plan.target)
  const evidenceIds=[...new Set([...(result.evidenceIds ?? []),...(parsed ? verifiedEvidenceIds(parsed,new Set(evidenceState.evidence.map(item=>item.id))) : [])])]

  const lifecycle=await recordAttemptLifecycle(
    root,
    plan.target,
    attemptId,
    {
      state:effectiveState,
      requestId:result.requestId,
      resultSummary:result.resultSummary,
      evidenceIds,
      skill:context.primarySkill,
      endpoint:context.endpoint,
      confidence:context.signalConfidence,
      taskId:context.taskId,
    },
  )

  let promotion:FindingPromotionResult|undefined
  if(
    lifecycle.hypothesisStatus==="confirmed" &&
    lifecycle.validation?.decision==="eligible" &&
    parsed?.impact
  ){
    try{
      promotion=await promoteValidatedHypothesis(root,plan.target,{
        hypothesisId:prepared.hypothesis.id,
        title:parsed.title ?? (context.signal+" validated finding"),
        severity:parsed.severity ?? "medium",
        summary:parsed.resultSummary,
        impact:parsed.impact,
        remediation:parsed.remediation,
        validation:lifecycle.validation,
        signal:context.signal,
        skill:context.primarySkill,
        endpoint:context.endpoint,
        strategy:prepared.attempt.strategy,
      })
    }catch{
      await checkpointPhase(root,plan.target,"finding:promotion-blocked:"+prepared.hypothesis.id)
    }
  }

  const terminal=effectiveState==="confirmed" || effectiveState==="blocked" || lifecycle.hypothesisStatus==="rejected"
  const taskState=effectiveState==="blocked"
    ? "blocked"
    : terminal
      ? "completed"
      : "running"
  if(terminal) await finishAgentTask(root,plan.target,taskId,taskState)
  await checkpointPhase(root,plan.target,"task:"+taskId+":"+taskState)

  return {context,result:{...result,state:effectiveState},lifecycle,promotion}
}

export async function executePersistedTaskWithNativeCyberStrike(
  root:string,
  plan:MultiAgentPlan,
  taskId:string,
  options:{
    agentBySkill?:Record<string,string>
    agentByRole?:Record<string,string>
    defaultAgent?:string
    parentSessionID?:string
    model?:{providerID:string;modelID:string}
  }={},
){
  const { NativeCyberStrikeExecutor }=await import("./native-cyberstrike-executor")
  const executor=new NativeCyberStrikeExecutor(options)
  return executeAndRecordDispatchedTask(root,plan,taskId,executor)
}
