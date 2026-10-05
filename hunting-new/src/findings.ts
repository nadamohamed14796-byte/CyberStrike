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

export function findingFingerprint(input:Pick<FindingInput,"target"|"title"|"hypothesisId"|"chainId"|"evidence">):string {
  const evidenceKeys=input.evidence.map(x=>[x.kind,x.sourceId,x.requestId??"",x.responseId??"",x.jsAssetId??"",x.functionId??""].join(":")).sort()
  return crypto.createHash("sha256").update([input.target.trim().toLowerCase(),input.title.trim().toLowerCase(),input.hypothesisId,input.chainId??"",...evidenceKeys].join("|")).digest("hex")
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
