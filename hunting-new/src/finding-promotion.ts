import { buildFinding, type FindingRecord, type FindingSeverity } from "./findings"
import { markReportable, checkFindingEvidence } from "./report-intelligence"
import { loadEvidence } from "./evidence-store"
import { loadAttempts } from "./attempt-store"
import { loadHypotheses } from "./hypothesis-store"
import { loadFindings, upsertFinding } from "./finding-store"
import { validateHypothesis, type ValidationResult } from "./validation-gate"

export interface FindingPromotionInput {
  hypothesisId:string
  title:string
  severity:FindingSeverity
  summary:string
  impact:string
  remediation?:string
  chainId?:string
  validation:ValidationResult
}

export interface FindingPromotionResult {
  finding:FindingRecord
  reportable:boolean
  missing:string[]
}

export async function promoteValidatedHypothesis(
  root:string,
  target:string,
  input:FindingPromotionInput,
):Promise<FindingPromotionResult>{
  if(input.validation.decision!=="eligible"){
    throw new Error("FINDING_BLOCKED: hypothesis did not pass validation gate")
  }

  const [hypotheses,evidenceState,attemptState]=await Promise.all([
    loadHypotheses(root,target),
    loadEvidence(root,target),
    loadAttempts(root,target),
  ])
  const hypothesis=hypotheses.hypotheses.find(x=>x.id===input.hypothesisId)
  if(!hypothesis) throw new Error("HYPOTHESIS_NOT_FOUND")
  if(hypothesis.status!=="confirmed") throw new Error("FINDING_BLOCKED: hypothesis is not confirmed")

  const linkedEvidence=evidenceState.evidence.filter(x =>
    input.validation.evidenceIds.includes(x.id) ||
    hypothesis.evidenceIds.includes(x.id)
  )
  const linkedAttempts=attemptState.attempts.filter(x =>
    x.hypothesisId===hypothesis.id &&
    (x.state==="executed"||x.state==="confirmed"||x.state==="rejected"||x.state==="inconclusive")
  )

  const finding=buildFinding({
    target,
    title:input.title,
    severity:input.severity,
    hypothesisId:hypothesis.id,
    chainId:input.chainId,
    attemptIds:linkedAttempts.map(x=>x.id),
    evidence:linkedEvidence,
    summary:input.summary,
    impact:input.impact,
    remediation:input.remediation,
  })

  const completeness=checkFindingEvidence(finding)
  if(!completeness.complete){
    await upsertFinding(root,target,finding)
    return {finding,reportable:false,missing:completeness.missing}
  }

  const validated=markReportable(finding)
  await upsertFinding(root,target,validated)
  return {finding:validated,reportable:true,missing:[]}
}

export async function findStoredFinding(root:string,target:string,fingerprint:string){
  const state=await loadFindings(root,target)
  return state.findings.find(x=>x.fingerprint===fingerprint)
}
