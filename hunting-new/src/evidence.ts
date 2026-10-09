import crypto from "node:crypto"

export type EvidenceKind = "request"|"response"|"js-asset"|"function"|"account"|"attempt"|"observation"|"replay"|"browser"|"inference"

export interface EvidenceRecord {
  id:string
  kind:EvidenceKind
  sourceId:string
  requestId?:string
  responseId?:string
  jsAssetId?:string
  functionId?:string
  attemptId?:string
  accountLabel?:string
  confidence:number
  observedAt:string
  details:string
}

export function evidenceFingerprint(input:Pick<EvidenceRecord,"kind"|"sourceId"|"requestId"|"responseId"|"jsAssetId"|"functionId"|"attemptId"|"accountLabel">):string{
  return crypto.createHash("sha256").update([
    input.kind,input.sourceId,input.requestId??"",input.responseId??"",
    input.jsAssetId??"",input.functionId??"",input.attemptId??"",input.accountLabel??"",
  ].join("|")).digest("hex")
}

export function createEvidence(input:Omit<EvidenceRecord,"id"|"observedAt">):EvidenceRecord{
  const fingerprint=evidenceFingerprint(input)
  return {...input,id:"evidence_"+fingerprint.slice(0,20),observedAt:new Date().toISOString()}
}

export function mergeEvidence(items:EvidenceRecord[]):EvidenceRecord[]{
  const byFingerprint=new Map<string,EvidenceRecord>()
  for(const item of items){
    const fp=evidenceFingerprint(item)
    const existing=byFingerprint.get(fp)
    if(!existing || item.confidence>existing.confidence) byFingerprint.set(fp,item)
  }
  return [...byFingerprint.values()]
}

/* Legacy evidence shape retained for callers that only need execution metadata. */
export type Evidence={
  evidence_id:string
  source_type:"OBSERVED_TRAFFIC"|"EXECUTED_VALIDATION"|"BROWSER"|"RESPONSE_COMPARISON"|"APPLICATION_STATE"|"SOURCE_CODE"
  source_reference:string
  execution_id?:string
  request_id?:string
  response_id?:string
  timestamp:string
  account_context?:string
  redacted:boolean
}

export function evidence(id:string,input:Omit<Evidence,"evidence_id"|"timestamp">):Evidence{
  return {...input,evidence_id:id,timestamp:new Date().toISOString()}
}

export function executableResult(status:Evidence["source_type"]|"EXECUTED"|"NOT_EXECUTED"|"FAILED_TO_EXECUTE"|"INCONCLUSIVE"|"VERIFIED"){return status}
