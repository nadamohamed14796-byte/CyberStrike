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
import { runScopedParameterDiscovery, type DiscoveryTool } from "./external-tool-runner"
import { ensureAttemptEvidence } from "./evidence-store"
import { loadWriteups, strategyHintsFromWriteups } from "./writeup-store"
import { indexSkillReferences, referencesForSkills, markReferencesUsed } from "./reference-store"

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
    parameters:intelligence.parameters,
    apiSources:intelligence.apiSources,
    edges:intelligence.edges,
  })
  const registry=await loadSkillRegistry(root)
  await indexSkillReferences(root,registry.list())
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
    task.recommendedAgent=registry.get(task.skill)?.agent
    const refs=await referencesForSkills(root,task.resolvedSkills,8)
    task.referenceIds=refs.map(x=>x.id)
    task.referenceUrls=refs.map(x=>x.url)
  }

  await saveAgentPlan(root,plan)
  const routedSkills=[...new Map(
    plan.tasks.flatMap(task=>[...(task.resolvedSkills??[]).map(name=>registry.get(name))].filter((skill):skill is NonNullable<typeof skill>=>Boolean(skill)))
      .map(skill=>[skill.name,skill] as const)
  ).values()]
  await indexSkillReferences(root,routedSkills)
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
    task.resolvedSkillPaths=resolved.map(skill=>skill.source_path).filter((value):value is string=>Boolean(value))
    task.recommendedAgent=registry.get(task.skill)?.agent
  }

  await saveAgentPlan(root,plan)
  const routedSkills=[...new Map(
    plan.tasks.flatMap(task=>[...(task.resolvedSkills??[]).map(name=>registry.get(name))].filter((skill):skill is NonNullable<typeof skill>=>Boolean(skill)))
      .map(skill=>[skill.name,skill] as const)
  ).values()]
  await indexSkillReferences(root,routedSkills)

  return {
    plan,
    persistedTaskIds:created.map(x=>x.taskId),
    resolvedSkillCount:plan.tasks.reduce((sum,task)=>sum+(task.resolvedSkills?.length??0),0),
  }
}

import { dispatchAgentTasks } from "./multi-agent-planner"
import { loadTaskStates, saveTaskState, transitionTaskState } from "./task-state-store"
import { claimAgentTask, finishAgentTask, setAgentTaskState } from "./agent-task-runtime"

export async function dispatchPersistedTasks(
  root:string,
  prepared:PreparedMultiAgentPlan,
  limit=4,
){
  await recoverStaleAgentTasks(root,prepared.plan.target)
  const state=await loadTaskStates(root,prepared.plan.target)
  const states=new Map(state.tasks.map(task=>[task.taskId,task.state] as const))
  const batch=dispatchAgentTasks(prepared.plan,states,limit)
  for(const task of batch.dependencyBlocked){
    const current=state.tasks.find(item=>item.taskId===task.id)
    if(current?.state==="pending"){
      await transitionTaskState(root,prepared.plan.target,task.id,"blocked",undefined,["pending"])
    }else if(!current){
      await saveTaskState(root,prepared.plan.target,{
        taskId:task.id,
        state:"blocked",
        attempts:0,
        updatedAt:new Date().toISOString(),
      })
    }
  }
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

const validationReservationQueues=new Map<string,Promise<void>>()
async function withValidationReservation<T>(key:string,work:()=>Promise<T>):Promise<T>{
  const previous=validationReservationQueues.get(key) ?? Promise.resolve()
  let release!:()=>void
  const current=new Promise<void>(resolve=>{release=resolve})
  validationReservationQueues.set(key,current)
  await previous
  try{return await work()}finally{
    release()
    if(validationReservationQueues.get(key)===current)validationReservationQueues.delete(key)
  }
}

export async function prepareAgentTaskValidation(
  root:string,
  plan:MultiAgentPlan,
  taskId:string,
):Promise<PreparedTaskValidation>{
  const context=buildAgentTaskExecutionContext(plan,taskId)
  const accountSensitive=["multiple_accounts","object_identifier_detected","tenant_identifier_detected","authenticated_endpoint"].includes(context.signal)
  const assetIdentity=[...(context.jsAssetIds??[])].sort().join(",")
  const requestIdentity=accountSensitive ? "" : (context.requestId??"")
  const reservationKey=[
    plan.target,
    context.signal,
    context.primarySkill,
    context.endpoint??"",
    context.functionId??"",
    requestIdentity,
    context.responseId??"",
    context.parameterId??"",
    assetIdentity,
  ].join("|")
  return withValidationReservation(reservationKey,async()=>{
  const hypothesisId="hyp_"+Bun.hash([
    context.signal,
    context.target,
    context.primarySkill,
    context.endpoint??"",
    context.functionId??"",
    requestIdentity,
    context.responseId??"",
    context.parameterId??"",
    assetIdentity,
  ].join("|")).toString(16)
  const storedHypotheses=await loadHypotheses(root,plan.target)
  await loadTargetIntelligence(root,plan.target)
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
  const ledger=await PersistentAttemptLedger.create(root,plan.target,{maxAttempts:20,minimumAttempts:20,stopOnConfirmation:false,stopOnRejection:false})
  const existingPlanned=ledger.list(hypothesis.id).find(x=>x.state==="planned")
  if(existingPlanned) return {hypothesis,attempt:existingPlanned}
  const used=new Set(ledger.list(hypothesis.id).map(x=>x.strategy+":"+x.variant))
  const learningState=await loadLearning(root,plan.target)
  const learningEngine=LearningEngine.fromObservations(learningState.observations)
  const falsePositiveState=await loadFalsePositives(root,plan.target)
  const falsePositiveIntelligence=hydrateFalsePositiveIntelligence(falsePositiveState)
  const writeups=await loadWriteups(root)
  const referenceStrategies=strategyHintsFromWriteups(writeups,hypothesis.signal)
  const validationPlan=createValidationPlan(
    hypothesis,
    {maxAttempts:20,minimumAttempts:20},
    learningEngine,
    falsePositiveIntelligence,
    plan.target,
    referenceStrategies,
  )
  const referenceRank=new Map(referenceStrategies.map((strategy,index)=>[strategy,index]))
  const rankedVariants=[...validationPlan.variants].sort((a,b)=>
    (referenceRank.get(a.strategy)??referenceStrategies.length) -
    (referenceRank.get(b.strategy)??referenceStrategies.length)
  )
  const next=rankedVariants.find(x=>!used.has(x.strategy+":"+x.variant))
  if(!next) throw new Error("VALIDATION_ATTEMPT_BUDGET_EXHAUSTED")
  const attempt=await ledger.plan(
    hypothesis.id,
    next.strategy,
    next.variant,
    `signal=${context.signal}; skill=${context.primarySkill}; strategy=${next.strategy}; variant=${next.variant}`,
  )
  if(!attempt) throw new Error("VALIDATION_ATTEMPT_UNAVAILABLE")
  return {hypothesis,attempt}
  })
}

export interface AgentTaskExecutionContext {
  taskId:string
  target:string
  role?:import("./multi-agent-planner").HuntingAgentRole
  primarySkill:string
  resolvedSkills:string[]
  resolvedSkillPaths?:string[]
  recommendedAgent?:string
  referenceIds?:string[]
  referenceUrls?:string[]
  strategyHints:string[]
  signal:string
  signalConfidence:number
  endpoint?:string
  functionId?:string
  requestId?:string
  requestUrl?:string
  requestMethod?:string
  parameterId?:string
  parameterName?:string
  parameterLocation?:"path"|"query"|"body"
  responseId?:string
  responseStatus?:number
  jsAssetIds?:string[]
  jsAssetUrls?:string[]
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
  const explicitResponse=context.responseId
    ? intelligence.responses.find(item=>item.id===context.responseId)
    : undefined
  if(context.responseId && !explicitResponse) {
    throw new Error("AGENT_RESPONSE_NOT_FOUND: "+context.responseId)
  }
  const responseRequest=explicitResponse
    ? intelligence.requests.find(request=>request.id===explicitResponse.requestId)
    : undefined
  if(explicitResponse && !responseRequest) {
    throw new Error("AGENT_RESPONSE_REQUEST_NOT_FOUND: "+explicitResponse.requestId)
  }

  const exact=context.requestId
    ? intelligence.requests.find(request=>request.id===context.requestId)
    : responseRequest
  if(context.requestId && !exact) throw new Error("AGENT_REQUEST_NOT_FOUND: "+context.requestId)
  if(context.requestId && responseRequest && context.requestId!==responseRequest.id) {
    throw new Error("AGENT_CORRELATION_MISMATCH: response identity does not match request")
  }
  if(exact && context.endpoint && exact.path!==context.endpoint && !exact.url.includes(context.endpoint)){
    throw new Error("AGENT_CORRELATION_MISMATCH: endpoint identity does not match request")
  }
  if(context.accountLabel && exact){
    const observedAccount=exact.accountLabel ?? exact.credentialId
    if(!observedAccount || observedAccount!==context.accountLabel){
      throw new Error("AGENT_CORRELATION_MISMATCH: account identity does not match request")
    }
  }

  const parameter=context.parameterId
    ? intelligence.parameters.find(item=>item.id===context.parameterId)
    : undefined
  if(context.parameterId && !parameter) {
    throw new Error("AGENT_PARAMETER_NOT_FOUND: "+context.parameterId)
  }
  if(parameter && context.endpoint && parameter.endpoint!==context.endpoint) {
    throw new Error("AGENT_CORRELATION_MISMATCH: parameter endpoint does not match task endpoint")
  }
  if(parameter && context.requestId && !parameter.requestIds.includes(context.requestId)) {
    throw new Error("AGENT_CORRELATION_MISMATCH: parameter identity does not belong to request")
  }

  const knownAssetIds=new Set(intelligence.jsAssets.map(asset=>asset.id))
  const requestedAssets=new Set(context.jsAssetIds ?? [])
  for(const id of requestedAssets){
    if(!knownAssetIds.has(id)) throw new Error("AGENT_JS_ASSET_NOT_FOUND: "+id)
  }
  const requestedFunctions=new Set([...(context.functionIds ?? []), ...(context.functionId ? [context.functionId] : [])])
  for(const fn of intelligence.functions){
    if(fn.assetId && requestedAssets.has(fn.assetId)) requestedFunctions.add(fn.id)
  }
  const linkedRequestIds=new Set(intelligence.edges.filter(edge =>
    (edge.kind==="observed-on" && requestedAssets.has(edge.from)) ||
    (edge.kind==="triggered-by" && requestedFunctions.has(edge.from))
  ).map(edge=>edge.to))

  const candidates=intelligence.requests.filter(request=>{
    if(context.endpoint && request.path!==context.endpoint && !request.url.includes(context.endpoint)) return false
    if(context.accountLabel && (request.accountLabel ?? request.credentialId)!==context.accountLabel) return false
    return true
  }).sort((a,b)=>b.observedAt-a.observedAt)
  const accountIdentity=(request:typeof intelligence.requests[number])=>request.accountLabel ?? request.credentialId ?? "__anonymous__"
  const oneAccountOnly=(items:typeof intelligence.requests)=>new Set(items.map(accountIdentity)).size===1
  const linkedCandidates=candidates.filter(candidate=>linkedRequestIds.has(candidate.id))
  const linkedRequest=linkedCandidates.length && oneAccountOnly(linkedCandidates) ? linkedCandidates[0] : undefined
  const endpointRequest=context.endpoint && candidates.length && oneAccountOnly(candidates) ? candidates[0] : undefined
  // Only bind a request when the task supplies a request/response, an endpoint,
  // or an unambiguous graph edge linking its JS/function identity. Never borrow an
  // unrelated or cross-account "latest request" for a global JavaScript signal.
  const request=exact ?? responseRequest ?? linkedRequest ?? endpointRequest
  if(context.responseId && request && explicitResponse?.requestId!==request.id) {
    throw new Error("AGENT_CORRELATION_MISMATCH: response identity does not match selected request")
  }
  const response=explicitResponse ?? (request
    ? intelligence.responses.filter(item=>item.requestId===request.id).sort((a,b)=>b.observedAt-a.observedAt)[0]
    : undefined)
  const relatedEdges=request
    ? intelligence.edges.filter(edge=>edge.from===request.id || edge.to===request.id)
    : []
  const functionIds=new Set<string>(context.functionIds ?? [])
  const jsAssetIds=new Set<string>(context.jsAssetIds ?? [])
  for(const edge of relatedEdges){
    if(edge.kind==="triggered-by") functionIds.add(edge.from)
    // "observed-on" is used by both JS-asset→request and parameter→request edges.
    // Only graph nodes registered as JavaScript assets belong in jsAssetIds.
    if(edge.kind==="observed-on" && knownAssetIds.has(edge.from)) jsAssetIds.add(edge.from)
  }
  const resolvedAssets=new Set(jsAssetIds)
  const assetUrls=[...new Set([
    ...(context.jsAssetUrls ?? []),
    ...intelligence.jsAssets.filter(asset=>resolvedAssets.has(asset.id)).map(asset=>asset.url),
  ])]
  if(context.functionId) functionIds.add(context.functionId)
  const refs=await referencesForSkills(root,context.resolvedSkills,8)
  if(refs.length) await markReferencesUsed(root,refs.map(item=>item.id))
  return {
    ...context,
    requestId:request?.id ?? context.requestId,
    requestUrl:request?.url ?? context.requestUrl,
    requestMethod:request?.method ?? context.requestMethod,
    responseId:response?.id ?? context.responseId,
    responseStatus:response?.status ?? context.responseStatus,
    parameterName:parameter?.name ?? context.parameterName,
    parameterLocation:parameter?.location ?? context.parameterLocation,
    accountLabel:context.accountLabel ?? request?.accountLabel ?? request?.credentialId,
    functionIds:[...functionIds],
    jsAssetIds:[...jsAssetIds],
    jsAssetUrls:assetUrls,
    referenceIds:refs.map(item=>item.id),
    referenceUrls:refs.map(item=>item.url),
  }
}

export function buildAgentTaskExecutionContext(plan:MultiAgentPlan,taskId:string):AgentTaskExecutionContext{
  const task=plan.tasks.find(item=>item.id===taskId)
  if(!task) throw new Error("AGENT_TASK_NOT_FOUND")
  return { taskId:task.id, target:task.target, role:task.role, primarySkill:task.skill, resolvedSkills:task.resolvedSkills??[task.skill], resolvedSkillPaths:task.resolvedSkillPaths, recommendedAgent:task.recommendedAgent, referenceIds:task.referenceIds, referenceUrls:task.referenceUrls, strategyHints:[...task.strategyHints], signal:task.signal, signalConfidence:task.signalConfidence, requestId:task.requestId, responseId:task.responseId, jsAssetIds:task.jsAssetId ? [task.jsAssetId] : undefined, accountLabel:task.accountLabel, parameterId:task.parameterId, endpoint:task.endpoint, functionId:task.functionId, reason:task.reason }
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

export interface ExternalToolDispatchResult {
  tool: DiscoveryTool
  executed: boolean
  parameters: number
  reason?: string
}

export async function executeSignalTools(
  root:string,
  target:string,
  signal:string,
  endpoint?:string,
  requestId?:string,
  tool:DiscoveryTool="arjun",
):Promise<ExternalToolDispatchResult>{
  if(signal !== "parameter_discovered") return {tool,executed:false,parameters:0,reason:"signal has no external-tool adapter"}
  if(!endpoint) return {tool,executed:false,parameters:0,reason:"parameter discovery requires an endpoint"}
  const result=await runScopedParameterDiscovery(root, target, endpoint, requestId, tool)
  return {tool,executed:result.allowed,parameters:result.parameters.length,reason:result.allowed?undefined:"scope blocked"}
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
):Promise<{context:AgentTaskExecutionContext; result:Awaited<ReturnType<AgentTaskExecutor["execute"]>>; lifecycle?:AttemptLifecycleResult; promotion?:FindingPromotionResult; refreshedPlan?:PreparedMultiAgentPlan}>{
  const base=buildAgentTaskExecutionContext(plan,taskId)
  const mission=await loadMission(root,plan.target)
  if(!mission) throw new Error("MISSION_NOT_FOUND")
  const initialScope=checkScope(plan.target,mission.scope)
  if(!initialScope.allowed) throw new Error("VALIDATION_SCOPE_BLOCKED: "+initialScope.reason)

  const prepared=await prepareAgentTaskValidation(root,plan,taskId)
  const baseContext={...base,attemptId:prepared.attempt.id}
  const context=await enrichAgentTaskExecutionContext(root,plan,baseContext)
  if(context.referenceIds?.length) await markReferencesUsed(root,context.referenceIds)

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

  if(context.signal==="parameter_discovered" && context.endpoint){
    await executeSignalTools(root,plan.target,context.signal,context.endpoint,context.requestId,"arjun")
    await executeSignalTools(root,plan.target,context.signal,context.endpoint,context.requestId,"x8")
  }

  const result=await executor.execute(context)
  const parsed=result.resultText
    ? parseExecutionResult(result.resultText,{state:result.state,outcome:"clean"})
    : undefined
  const effectiveState=parsed?.state ?? result.state
  const attemptId=prepared.attempt.id
  const executionEvidenceIds=await ensureAttemptEvidence(root,plan.target,{attemptId:prepared.attempt.id,requestId:result.requestId??context.requestId,responseId:result.responseId??context.responseId,accountLabel:context.accountLabel})
  const evidenceState=await (await import("./evidence-store")).loadEvidence(root,plan.target)
  const evidenceIds=[...new Set([...executionEvidenceIds,...(result.evidenceIds ?? []),...(parsed ? verifiedEvidenceIds(parsed,new Set(evidenceState.evidence.map(item=>item.id))) : [])])]

  const lifecycle=await recordAttemptLifecycle(
    root,
    plan.target,
    attemptId,
    {
      state:effectiveState,
      requestId:result.requestId??context.requestId,
      responseId:result.responseId??context.responseId,
      accountMode:context.accountLabel,
      resultSummary:result.resultSummary,
      evidenceIds,
      skill:context.primarySkill,
      endpoint:context.endpoint,
      confidence:context.signalConfidence,
      impactObserved:Boolean(parsed?.impact?.trim()),
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
    rootCause:parsed.rootCause,
        reproduction:parsed.reproduction,
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

  const validationEligible=lifecycle.validation?.decision==="eligible"
  const promotionResolved=!validationEligible || Boolean(promotion?.reportable) || promotion?.action==="skip"
  const terminal=effectiveState==="blocked" ||
    lifecycle.hypothesisStatus==="rejected" ||
    (lifecycle.hypothesisStatus==="confirmed" && promotionResolved)
  const taskState=effectiveState==="blocked"
    ? "blocked"
    : terminal
      ? "completed"
      : "running"
  if(terminal){
    await finishAgentTask(root,plan.target,taskId,taskState)
    if(context.endpoint){
      const endpointLedger=ledgers(root,plan.target).endpoint
      const endpointId="endpoint_"+Bun.hash([
        context.endpoint.trim(),
        context.requestId??"",
      ].join("|")).toString(16)
      await endpointLedger.upsert({
        item_id:endpointId,
        type:"endpoint",
        status:taskState==="blocked"?"BLOCKED":taskState==="completed"?"VALIDATED":"IN_PROGRESS",
        assigned_task:taskId,
        last_tested:new Date().toISOString(),
        evidence_refs:evidenceIds,
        next_action:taskState==="completed" ? null : "revisit validation",
      })
    }
  }
  if(!terminal){
    await setAgentTaskState(root,plan.target,taskId,"running",Math.max(1,(await loadTaskStates(root,plan.target)).tasks.find(x=>x.taskId===taskId)?.attempts??1))
  }
  await checkpointPhase(root,plan.target,"task:"+taskId+":"+taskState)

  return {context,result:{...result,state:effectiveState},lifecycle,promotion}
}

export interface MultiAttemptExecutionResult {
  iterations:number
  terminal:boolean
  results:Array<Awaited<ReturnType<AgentTaskExecutor["execute"]>> & { attemptId?:string }>
}

export async function executeTaskUntilTerminal(
  root:string,
  plan:MultiAgentPlan,
  taskId:string,
  executor:AgentTaskExecutor,
  maxIterations=20,
):Promise<MultiAttemptExecutionResult>{
  const results:Array<Awaited<ReturnType<AgentTaskExecutor["execute"]>> & { attemptId?:string }>=[]

  for(let i=0;i<Math.min(Math.max(maxIterations,1),20);i++){
    const execution=await executeAndRecordDispatchedTask(root,plan,taskId,executor)
    results.push(execution.result)
    const eligible=execution.lifecycle?.validation?.decision==="eligible"
    const promotionResolved=!eligible || Boolean(execution.promotion?.reportable) || execution.promotion?.action==="skip"
    if(
      execution.result.state==="blocked" ||
      execution.lifecycle?.hypothesisStatus==="rejected" ||
      (execution.lifecycle?.hypothesisStatus==="confirmed" && promotionResolved)
    ){
      return {iterations:i+1,terminal:true,results}
    }
    await checkpointPhase(root,plan.target,`validation:attempt:${i+1}:continue`)
  }

  return {iterations:results.length,terminal:false,results}
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
