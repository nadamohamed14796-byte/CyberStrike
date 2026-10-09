import crypto from "node:crypto"
import type { EvidenceRecord } from "./evidence"

export type FindingStatus = "draft" | "validated" | "rejected" | "reported"
export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical"

export interface FindingRecord {
  id: string
  fingerprint: string
  target: string
  title: string
  severity: FindingSeverity
  status: FindingStatus
  hypothesisId: string
  chainId?: string
  attemptIds: string[]
  evidenceIds: string[]
  requestIds: string[]
  responseIds: string[]
  jsAssetIds: string[]
  functionIds: string[]
  accountLabels: string[]
  summary: string
  impact: string
  remediation?: string
  createdAt: string
  updatedAt: string
}

export interface FindingInput {
  target: string
  title: string
  severity: FindingSeverity
  hypothesisId: string
  chainId?: string
  attemptIds?: string[]
  evidence: EvidenceRecord[]
  summary: string
  impact: string
  remediation?: string
}

const unique=(v:string[])=>[...new Set(v.filter(Boolean))]

export function findingFingerprint(input:Pick<FindingInput,"target"|"hypothesisId"|"chainId">):string {
  return crypto.createHash("sha256").update([
    input.target.trim().toLowerCase(),
    input.hypothesisId,
    input.chainId??"",
  ].join("|")).digest("hex")
}

export function buildFinding(input:FindingInput):FindingRecord {
  const now=new Date().toISOString(), fp=findingFingerprint(input), e=input.evidence
  return {
    id:"finding_"+fp.slice(0,20),fingerprint:fp,target:input.target,title:input.title,severity:input.severity,status:"draft",
    hypothesisId:input.hypothesisId,chainId:input.chainId,attemptIds:unique(input.attemptIds??[]),
    evidenceIds:unique(e.map(x=>x.id)),requestIds:unique(e.flatMap(x=>x.requestId?[x.requestId]:[])),
    responseIds:unique(e.flatMap(x=>x.responseId?[x.responseId]:[])),jsAssetIds:unique(e.flatMap(x=>x.jsAssetId?[x.jsAssetId]:[])),
    functionIds:unique(e.flatMap(x=>x.functionId?[x.functionId]:[])),accountLabels:unique(e.flatMap(x=>x.accountLabel?[x.accountLabel]:[])),
    summary:input.summary,impact:input.impact,remediation:input.remediation,createdAt:now,updatedAt:now
  }
}

export function updateFinding(f:FindingRecord,p:Partial<Pick<FindingRecord,"status"|"summary"|"impact"|"remediation">>):FindingRecord {
  return {...f,...p,updatedAt:new Date().toISOString()}
}

export interface LegacyFinding {
  finding_id:string
  target:string
  category:string
  root_cause:string
  state:"VERIFIED"|"FALSE_POSITIVE"|"INCONCLUSIVE"|"BLOCKED"
  confidence:number
  exploitability:number
  impact:number
  evidence_refs:string[]
}

export function dedupe(findings:LegacyFinding[]):LegacyFinding[] {
  const seen=new Map<string,LegacyFinding>()
  for(const finding of findings){
    const key=[finding.target.trim().toLowerCase(),finding.category.trim().toLowerCase(),finding.root_cause.trim().toLowerCase()].join("|")
    const existing=seen.get(key)
    if(!existing || finding.confidence>existing.confidence || finding.impact>existing.impact) seen.set(key,finding)
  }
  return [...seen.values()]
}

export function evidenceBackedSeverity(confidence:number,exploitability:number,impact:number):FindingSeverity {
  const score=Math.max(0,Math.min(1,confidence))*0.35+Math.max(0,Math.min(1,exploitability))*0.3+Math.max(0,Math.min(1,impact))*0.35
  if(score>=0.85)return "critical"
  if(score>=0.7)return "high"
  if(score>=0.5)return "medium"
  if(score>=0.3)return "low"
  return "info"
}
