import path from "node:path"
import { ensureDir,targetDir, withTargetMutationLock } from "./store"
import type { FindingRecord } from "./findings"
import { loadFindings } from "./finding-store"
import { loadHypotheses } from "./hypothesis-store"
import { loadAttempts } from "./attempt-store"
import { recordLearning } from "./learning-store"
import { checkFindingEvidence } from "./report-intelligence"

export async function writeReport(
  root:string,
  finding:FindingRecord,
  sections:Record<string,string>={},
){
  if(finding.status!=="validated" && finding.status!=="reported") throw new Error("REPORT_GATE_FAILED")
  const gate=checkFindingEvidence(finding)
  if(!gate.complete) throw new Error("REPORT_GATE_FAILED: "+gate.missing.join(", "))

  const dir=path.join(targetDir(root,finding.target),"reports","drafts")
  await ensureDir(dir)
  const file=path.join(dir,finding.id+".md")
  const lines=[
    "# "+(sections.title??finding.title),
    "",
    "## Summary",
    sections.summary??finding.summary,
    "",
    "## Affected Asset",
    sections.asset??finding.target,
    "",
    "## Affected Endpoint",
    sections.endpoint??(finding.requestIds[0]??"Unknown"),
    "",
    "## Severity",
    finding.severity,
    "",
    "## Impact",
    sections.impact??finding.impact,
    "",
    "## Account Context",
    finding.accountLabels.length ? finding.accountLabels.join(", ") : "Not recorded",
    "",
    "## Steps to Reproduce",
    sections.steps??"See linked validation attempts and request/response evidence.",
    "",
    "## Evidence",
    ...finding.evidenceIds.map(id=>"- "+id),
    "",
    "## Requests",
    ...finding.requestIds.map(id=>"- "+id),
    "",
    "## Responses",
    ...finding.responseIds.map(id=>"- "+id),
    "",
    "## Validation Attempts",
    ...finding.attemptIds.map(id=>"- "+id),
    "",
    "## JavaScript Assets",
    ...finding.jsAssetIds.map(id=>"- "+id),
    "",
    "## Functions",
    ...finding.functionIds.map(id=>"- "+id),
    "",
    "## Root Cause",
    sections.root_cause??"Supported by the persisted evidence and validation chain.",
    "",
    "## Remediation",
    sections.remediation??finding.remediation??"",
  ]
  await Bun.write(file,lines.join("\n").replace(/\n{3,}/g,"\n\n")+"\n")
  return file
}


export type ReportStatus = "draft" | "ready" | "submitted" | "accepted" | "rejected"

export interface ReportRecord {
  id:string
  findingId:string
  fingerprint:string
  target:string
  status:ReportStatus
  file:string
  createdAt:string
  updatedAt:string
  submissionRef?:string
  reviewerNote?:string
}

interface ReportState { target:string; reports:ReportRecord[]; updatedAt:string }

async function loadReportState(root:string,target:string):Promise<ReportState>{
  const file=path.join(targetDir(root,target),"intelligence","reports.json")
  const { readJson }=await import("./store")
  return (await readJson<ReportState|null>(file,null)) ?? {target,reports:[],updatedAt:new Date().toISOString()}
}

async function saveReportState(root:string,state:ReportState):Promise<ReportState>{
  const dir=path.join(targetDir(root,state.target),"intelligence")
  await ensureDir(dir)
  const { writeJson }=await import("./store")
  const next={...state,updatedAt:new Date().toISOString()}
  await writeJson(path.join(dir,"reports.json"),next)
  return next
}

export async function createReportRecord(root:string,finding:FindingRecord,file:string):Promise<ReportRecord>{
  if(finding.status!=="validated" && finding.status!=="reported") throw new Error("REPORT_GATE_FAILED")
  return withTargetMutationLock(root, finding.target, async () => {
    const state=await loadReportState(root,finding.target)
    const existing=state.reports.find(x=>x.findingId===finding.id)
    if(existing)return existing
    const now=new Date().toISOString()
    const report:ReportRecord={
      id:"report_"+finding.id,findingId:finding.id,fingerprint:finding.fingerprint,
      target:finding.target,status:"ready",file,createdAt:now,updatedAt:now
    }
    state.reports.push(report)
    await saveReportState(root,state)
    return report
  })
}

export async function transitionReport(
  root:string,target:string,reportId:string,status:ReportStatus,
  meta:{submissionRef?:string;reviewerNote?:string}={},
):Promise<ReportRecord>{
  const report=await withTargetMutationLock(root,target,async()=>{
    const state=await loadReportState(root,target)
    const current=state.reports.find(x=>x.id===reportId)
    if(!current)throw new Error("REPORT_NOT_FOUND")
    if((current.status==="accepted"||current.status==="rejected") && current.status!==status){
      throw new Error("REPORT_STATE_CONFLICT: terminal report cannot transition")
    }
    if(current.status===status) return current
    current.status=status
    if(meta.submissionRef!==undefined)current.submissionRef=meta.submissionRef
    if(meta.reviewerNote!==undefined)current.reviewerNote=meta.reviewerNote
    current.updatedAt=new Date().toISOString()
    await saveReportState(root,state)
    return current
  })

  if(status==="accepted" || status==="rejected"){
    const findings=await loadFindings(root,target)
    const finding=findings.find(x=>x.id===report.findingId)
    if(finding){
      const hypotheses=await loadHypotheses(root,target)
      const hypothesis=hypotheses.hypotheses.find(x=>x.id===finding.hypothesisId)
      const attempts=await loadAttempts(root,target)
      const attempt=finding.attemptIds.length
        ? attempts.attempts.find(x=>x.id===finding.attemptIds[finding.attemptIds.length-1])
        : undefined
      await recordLearning(root,target,{
        target,
        signal:hypothesis?.signal ?? "report_review",
        skill:"report-review",
        strategy:attempt?.strategy ?? "report-review",
        outcome:status==="accepted" ? "confirmed" : "false_positive",
        confidence:status==="accepted" ? 1 : 0.9,
        timestamp:new Date().toISOString(),
      })
    }
  }

  return report
}

export async function loadReportsForTarget(root:string,target:string):Promise<ReportRecord[]>{
  return (await loadReportState(root,target)).reports
}
