import { PersistentAttemptLedger } from "./persistent-attempt-ledger"
import { transitionHypothesis, loadHypotheses } from "./hypothesis-store"
import { transitionChain, loadChains } from "./chain-store"
import { checkpointPhase } from "./runtime-persistence"
import { loadEvidence } from "./evidence-store"
import { validateHypothesis, hasBaselineComparison, hasBehaviorChange, hasCrossAccountEvidence, type ValidationResult } from "./validation-gate"
import { recordAttemptLearningFeedback } from "./attempt-learning-feedback"
import { setAgentTaskState } from "./agent-task-runtime"
import type { AttemptState } from "./adaptive-attempts"
import { canonicalSignal } from "./canonical-signals"

export interface AttemptLifecycleResult {
  attemptState: AttemptState
  hypothesisStatus: "pending"|"testing"|"confirmed"|"rejected"|"blocked"
  chainStatuses: Record<string, "open"|"testing"|"confirmed"|"rejected"|"blocked">
  validation?: ValidationResult
  learningRecorded: boolean
  falsePositiveRecorded: boolean
}

export async function recordAttemptLifecycle(
  root:string,
  target:string,
  attemptId:string,
  update:{
    state:AttemptState
    requestId?:string
    responseId?:string
    resultSummary?:string
    evidenceIds?:string[]
    skill?:string
    endpoint?:string
    accountMode?:string
    confidence?:number
    taskId?:string
  },
):Promise<AttemptLifecycleResult>{
  const { loadAttempts } = await import("./attempt-store")
  const stored=await loadAttempts(root,target)
  const attempt=stored.attempts.find(x=>x.id===attemptId)
  if(!attempt) throw new Error("ATTEMPT_NOT_FOUND")

  const ledger=await PersistentAttemptLedger.create(root,target,{maxAttempts:20})
  const recorded=await ledger.record(attemptId,update)
  const hypotheses=await loadHypotheses(root,target)
  const hypothesis=hypotheses.hypotheses.find(x=>x.id===recorded.hypothesisId)
  if(!hypothesis) throw new Error("HYPOTHESIS_NOT_FOUND")

  const evidenceState=await loadEvidence(root,target)
  const linked=evidenceState.evidence.filter(x =>
    recorded.evidenceIds.includes(x.id) || hypothesis.evidenceIds.includes(x.id)
  )
  const current=await loadAttempts(root,target)
  const hypothesisAttempts=current.attempts.filter(x=>x.hypothesisId===hypothesis.id)
  const executed=hypothesisAttempts.filter(x =>
    x.state==="executed"||x.state==="confirmed"||x.state==="rejected"||x.state==="inconclusive"
  ).length
  const variants=new Set(hypothesisAttempts.map(x=>x.strategy+":"+x.variant)).size

  const validation=recorded.state==="confirmed"
    ? validateHypothesis({
        hypothesisId:hypothesis.id,
        inScope:true,
        attemptsExecuted:Math.max(executed,1),
        evidence:linked.map(x=>({
          id:x.id,
          kind:x.kind==="request"?"request":x.kind==="response"?"response":x.kind==="js-asset"?"js":x.kind==="replay"?"replay":x.kind==="inference"?"inference":"browser",
          summary:x.details || x.sourceId,
          independent:x.confidence>=0.8,
          attemptId:x.attemptId,
          requestId:x.requestId,
          responseId:x.responseId,
          accountLabel:x.accountLabel,
        })),
        distinctVariants:variants,
        expectedImpact:"medium",
        targetConfirmed:true,
        baselineObserved:hasBaselineComparison(linked.map(x=>({id:x.id,kind:x.kind==="request"?"request":x.kind==="response"?"response":x.kind==="js-asset"?"js":x.kind==="replay"?"replay":x.kind==="inference"?"inference":"browser",summary:x.details||x.sourceId,independent:x.confidence>=0.8,observed:x.kind!=="inference",attemptId:x.attemptId,requestId:x.requestId,responseId:x.responseId,accountLabel:x.accountLabel}))),
        behaviorChanged:hasBehaviorChange(linked.map(x=>({id:x.id,kind:x.kind==="request"?"request":x.kind==="response"?"response":x.kind==="js-asset"?"js":x.kind==="replay"?"replay":x.kind==="inference"?"inference":"browser",summary:x.details||x.sourceId,independent:x.confidence>=0.8,observed:x.kind!=="inference",attemptId:x.attemptId,requestId:x.requestId,responseId:x.responseId}))),
        reproducible:variants >= 2,
        rootCauseSupported:linked.some(x=>x.kind==="function" || x.kind==="js-asset"),
        impactObserved:recorded.state==="confirmed",
        authorizationContextVerified: (() => {
          const signal=canonicalSignal(hypothesis.signal)
          const sensitive=["object_identifier_detected","authenticated_endpoint","tenant_identifier_detected","access_control_blocked","authorization","idor"]
          return sensitive.includes(signal)
            ? hasCrossAccountEvidence(linked.map(x=>({
              id:x.id,
              kind:x.kind==="request"?"request":x.kind==="response"?"response":x.kind==="js-asset"?"js":x.kind==="replay"?"replay":x.kind==="inference"?"inference":"browser",
              summary:x.details||x.sourceId,
              independent:x.confidence>=0.8,
              observed:x.kind!=="inference",
              attemptId:x.attemptId,
              requestId:x.requestId,
              responseId:x.responseId,
              accountLabel:x.accountLabel,
            })))
            : true
        })(),
      })
    : undefined

  const attemptCount = hypothesisAttempts.length
  const minimumAttempts = 20
  let hypothesisStatus:"pending"|"testing"|"confirmed"|"rejected"|"blocked" = "testing"
  if(recorded.state==="confirmed"){
    hypothesisStatus=validation?.decision==="eligible"
      ? "confirmed"
      : attemptCount>=minimumAttempts
        ? "blocked"
        : "testing"
  }else if(recorded.state==="rejected") hypothesisStatus=attemptCount >= minimumAttempts ? "rejected" : "testing"
  else if(recorded.state==="blocked") hypothesisStatus="blocked"
  else if(attemptCount>=minimumAttempts) hypothesisStatus="blocked"

  await transitionHypothesis(root,target,hypothesis.id,hypothesisStatus,
    recorded.evidenceIds.length ? [...new Set([...hypothesis.evidenceIds,...recorded.evidenceIds])] : undefined)

  const chains=await loadChains(root,target)
  const chainStatuses:AttemptLifecycleResult["chainStatuses"]={}
  for(const chain of chains.chains.filter(x=>x.hypothesisIds.includes(hypothesis.id))){
    let status=chain.status
    if(hypothesisStatus==="confirmed") status="confirmed"
    else if(hypothesisStatus==="rejected" && chain.hypothesisIds.length===1) status="rejected"
    else if(hypothesisStatus==="blocked") status="blocked"
    else if(hypothesisStatus==="testing" && status==="open") status="testing"
    if(status!==chain.status) await transitionChain(root,target,chain.id,status)
    chainStatuses[chain.id]=status
  }

  const learning=await recordAttemptLearningFeedback(
    root,
    target,
    recorded,
    hypothesis,
    hypothesisStatus,
    {
      skill:update.skill,
      endpoint:update.endpoint,
      accountMode:update.accountMode,
      confidence:update.confidence,
    },
  )

  if(update.taskId){
    const terminal=hypothesisStatus==="rejected" || hypothesisStatus==="blocked" ||
      (hypothesisStatus==="confirmed" && validation?.decision==="eligible")
    await setAgentTaskState(
      root,
      target,
      update.taskId,
      terminal ? "completed" : "running",
      attemptCount,
    )
  }

  await checkpointPhase(root,target,validation?.decision==="eligible" ? "validation:eligible" : "validation:state-transition")
  return {
    attemptState:recorded.state,
    hypothesisStatus,
    chainStatuses,
    validation,
    learningRecorded:learning.learningRecorded,
    falsePositiveRecorded:learning.falsePositiveRecorded,
  }
}
