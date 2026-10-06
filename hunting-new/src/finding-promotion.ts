import { buildFinding, type FindingRecord, type FindingSeverity } from "./findings"
import { markReportable, checkFindingEvidence } from "./report-intelligence"
import { loadEvidence } from "./evidence-store"
import { loadAttempts } from "./attempt-store"
import { loadHypotheses } from "./hypothesis-store"
import { loadFindings, upsertFinding } from "./finding-store"
import { FalsePositiveIntelligence } from "./false-positive-intelligence"
import { loadFalsePositives, hydrateFalsePositiveIntelligence } from "./false-positive-store"
import { dedupeDecision, shouldRecheckAfterNewEvidence } from "./dedupe-engine"
import type { ValidationResult, ValidationEvidence } from "./validation-gate"
import { validateHypothesis, hasBaselineComparison, hasBehaviorChange, hasCrossAccountEvidence } from "./validation-gate"
import { loadMission } from "./mission"
import { checkScope } from "./scope"
import { writeReport, createReportRecord } from "./report"
import { markValidated, stableLedgerId } from "./ledger"

export interface FindingPromotionInput {
  hypothesisId:string
  title:string
  severity:FindingSeverity
  summary:string
  impact:string
  remediation?:string
  rootCause?:string
  reproduction?:string
  chainId?:string
  validation:ValidationResult
  signal?:string
  skill?:string
  strategy?:string
  endpoint?:string
  accountMode?:string
}

export interface FindingPromotionResult {
  finding?:FindingRecord
  reportable:boolean
  missing:string[]
  action:"skip"|"recheck"|"create"
  reason:string
}

export async function promoteValidatedHypothesis(
  root:string,target:string,input:FindingPromotionInput,falsePositives?:FalsePositiveIntelligence,
):Promise<FindingPromotionResult>{
  const mission=await loadMission(root,target)
  if(!mission) throw new Error("MISSION_NOT_FOUND")
  const scope=checkScope(target,mission.scope)
  if(!scope.allowed) throw new Error("FINDING_BLOCKED: "+scope.reason)
  const [hypotheses,evidenceState,attemptState,findingState]=await Promise.all([
    loadHypotheses(root,target),loadEvidence(root,target),loadAttempts(root,target),loadFindings(root,target),
  ])
  const hypothesis=hypotheses.hypotheses.find(x=>x.id===input.hypothesisId)
  if(!hypothesis) throw new Error("HYPOTHESIS_NOT_FOUND")
  if(hypothesis.status!=="confirmed") throw new Error("FINDING_BLOCKED: hypothesis is not confirmed")
  const linkedEvidence=evidenceState.evidence.filter(x=>input.validation.evidenceIds.includes(x.id)||hypothesis.evidenceIds.includes(x.id))
  const linkedAttempts=attemptState.attempts.filter(x=>x.hypothesisId===hypothesis.id&&["executed","confirmed","rejected","inconclusive"].includes(x.state))
  const validationEvidence:ValidationEvidence[]=linkedEvidence.map(x=>({
    id:x.id,kind:x.kind==="request"?"request":x.kind==="response"?"response":x.kind==="js-asset"?"js":x.kind==="replay"?"replay":x.kind==="inference"?"inference":"browser",
    summary:x.details||x.sourceId,independent:x.confidence>=0.8,observed:x.kind!=="inference",
    attemptId:x.attemptId,requestId:x.requestId,responseId:x.responseId,accountLabel:x.accountLabel,
  }))
  const storedValidation=validateHypothesis({
    hypothesisId:hypothesis.id,inScope:true,attemptsExecuted:linkedAttempts.length,evidence:validationEvidence,
    distinctVariants:new Set(linkedAttempts.map(x=>x.strategy+":"+x.variant)).size,
    expectedImpact:input.severity==="critical"?"critical":input.severity==="high"?"high":"medium",
    targetConfirmed:true,baselineObserved:hasBaselineComparison(validationEvidence),
    behaviorChanged:hasBehaviorChange(validationEvidence),reproducible:new Set(linkedAttempts.map(x=>x.strategy+":"+x.variant)).size>=2,
    rootCauseSupported:linkedEvidence.some(x=>x.kind==="function"||x.kind==="js-asset"),impactObserved:true,
    authorizationContextVerified: ["object_identifier_detected","authorization","tenant_identifier_detected"].some(signal =>
      (input.signal??hypothesis.signal).includes(signal)
    ) ? hasCrossAccountEvidence(validationEvidence) : true,
  })
  if(input.validation.decision!=="eligible"||storedValidation.decision!=="eligible") throw new Error("FINDING_BLOCKED: stored validation evidence did not pass the promotion gate")
  const existing=findingState.findings.find(x=>x.hypothesisId===hypothesis.id&&x.chainId===input.chainId)
  if(existing){
    const newEvidence=linkedEvidence.some(x=>!existing.evidenceIds.includes(x.id))
    if(!newEvidence)return {finding:existing,reportable:existing.status==="validated"||existing.status==="reported",missing:[],action:"skip",reason:"matching finding already exists with no new evidence"}
  }
  const fpContext={target,signal:input.signal??hypothesis.signal,skill:input.skill??"unknown",strategy:input.strategy??"validation",endpoint:input.endpoint,accountMode:input.accountMode}
  const intelligence=falsePositives ?? hydrateFalsePositiveIntelligence(await loadFalsePositives(root,target))
  const dedupe=dedupeDecision(intelligence,fpContext)
  if(dedupe.action==="skip"&&!shouldRecheckAfterNewEvidence(intelligence,{...fpContext,evidenceIds:linkedEvidence.map(x=>x.id)}))return {reportable:false,missing:[],action:"skip",reason:dedupe.reason}
  const finding=buildFinding({target,title:input.title,severity:input.severity,hypothesisId:hypothesis.id,chainId:input.chainId,attemptIds:linkedAttempts.map(x=>x.id),evidence:linkedEvidence,summary:input.summary,impact:input.impact,remediation:input.remediation})
  const completeness=checkFindingEvidence(finding)
  if(!completeness.complete){await upsertFinding(root,target,finding);return {finding,reportable:false,missing:completeness.missing,action:"recheck",reason:"finding evidence is incomplete"}}
  const validated=markReportable(finding)
  await upsertFinding(root,target,validated)
  await markValidated(root,target,[
    {type:"finding",id:validated.id,evidence_refs:validated.evidenceIds,reason:"finding passed stored validation gate"},
    {type:"hypothesis",id:validated.hypothesisId,evidence_refs:validated.evidenceIds,reason:"hypothesis promoted to validated finding"},
    ...(input.endpoint ? [{type:"endpoint",id:stableLedgerId("endpoint",input.skill ? input.skill+"|"+input.endpoint : input.endpoint),evidence_refs:validated.evidenceIds}] : []),
  ])
  const reportFile=await writeReport(root,validated,{
    asset:target,
    endpoint:input.endpoint ?? undefined,
    root_cause:input.rootCause,
    steps:input.reproduction,
  })
  await createReportRecord(root,validated,reportFile)
  return {finding:validated,reportable:true,missing:[],action:"create",reason:"validated finding passed report evidence gate and report was created"}
}
export async function findStoredFinding(root:string,target:string,fingerprint:string){
  const state=await loadFindings(root,target)
  return state.findings.find(x=>x.fingerprint===fingerprint)
}
