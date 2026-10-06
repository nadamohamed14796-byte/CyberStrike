export type SubagentOutcome = "clean" | "aborted" | "errored" | "capped" | "stuck"

export interface ExecutionEvidenceRef {
  id:string
  kind:"request"|"response"|"browser"|"js"|"replay"|"inference"
  summary:string
  observed?:boolean
  independent?:boolean
}

export interface StructuredExecutionResult {
  state:"executed"|"inconclusive"|"blocked"|"rejected"|"confirmed"
  severity?: "info"|"low"|"medium"|"high"|"critical"
  title?:string
  impact?:string
  remediation?:string
  rootCause?:string
  reproduction?:string
  outcome:SubagentOutcome
  attemptId?:string
  requestId?:string
  responseId?:string
  resultSummary:string
  evidence:ExecutionEvidenceRef[]
  observations:string[]
}

export function buildExecutionContract():string{
  return [
    "EXECUTION RESULT CONTRACT",
    "Return a machine-readable result summary to the parent runtime.",
    "State must be one of: executed, inconclusive, blocked, rejected, confirmed.",
    "Do not mark confirmed from a status code or inference alone.",
    "Every claimed behavior change must reference observed request/response evidence.",
    "Preserve partial evidence when execution is blocked or incomplete.",
    "Separate observed facts from hypotheses and conclusions.",
    "When state is confirmed, include explicit severity and observed impact; do not invent either.",
    "When available, include root_cause and reproduction/steps as observed, evidence-backed text.",

  ].join("\n")
}

export function verifiedEvidenceIds(
  parsed:StructuredExecutionResult,
  availableEvidenceIds:ReadonlySet<string>,
):string[]{
  return parsed.evidence
    .filter(item=>availableEvidenceIds.has(item.id))
    .map(item=>item.id)
}

const STATES=new Set<StructuredExecutionResult["state"]>(["executed","inconclusive","blocked","rejected","confirmed"])
const OUTCOMES=new Set<SubagentOutcome>(["clean","aborted","errored","capped","stuck"])
const EVIDENCE_KINDS=new Set<ExecutionEvidenceRef["kind"]>(["request","response","browser","js","replay","inference"])

function firstJsonObject(text:string):unknown{
  const fenced=text.match(/\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`/i)
  const candidate=fenced?.[1]?.trim() ?? text.trim()
  const start=candidate.indexOf("{")
  const end=candidate.lastIndexOf("}")
  if(start<0 || end<=start)return undefined
  try{return JSON.parse(candidate.slice(start,end+1))}
  catch{return undefined}
}

function asState(value:unknown,fallback:StructuredExecutionResult["state"]){
  return typeof value==="string" && STATES.has(value as StructuredExecutionResult["state"])
    ? value as StructuredExecutionResult["state"]
    : fallback
}

function asOutcome(value:unknown,fallback:SubagentOutcome){
  return typeof value==="string" && OUTCOMES.has(value as SubagentOutcome)
    ? value as SubagentOutcome
    : fallback
}

function parseEvidence(value:unknown):ExecutionEvidenceRef[]{
  if(!Array.isArray(value))return []
  return value.flatMap(item=>{
    if(!item || typeof item!=="object")return []
    const record=item as Record<string,unknown>
    if(typeof record.id!=="string" || !record.id.trim())return []
    const kind=typeof record.kind==="string" && EVIDENCE_KINDS.has(record.kind as ExecutionEvidenceRef["kind"])
      ? record.kind as ExecutionEvidenceRef["kind"]
      : "inference"
    return [{
      id:record.id.trim(),
      kind,
      summary:typeof record.summary==="string" ? record.summary : "Referenced by subagent output",
      observed:typeof record.observed==="boolean" ? record.observed : kind!=="inference",
      independent:typeof record.independent==="boolean" ? record.independent : undefined,
    }]
  })
}

export function parseExecutionResult(
  text:string,
  fallback:Pick<StructuredExecutionResult,"state"|"outcome">,
):StructuredExecutionResult{
  const raw=firstJsonObject(text)
  if(raw && typeof raw==="object"){
    const record=raw as Record<string,unknown>
    const evidence=parseEvidence(record.evidence)
    const observations=Array.isArray(record.observations)
      ? record.observations.filter((item):item is string=>typeof item==="string").map(item=>item.trim()).filter(Boolean)
      : []
    const resultSummary=typeof record.result_summary==="string"
      ? record.result_summary
      : typeof record.resultSummary==="string"
        ? record.resultSummary
        : text.trim()
    return {
      state:asState(record.state ?? record.status,fallback.state),
      outcome:asOutcome(record.outcome,fallback.outcome),
      severity:typeof record.severity==="string" && ["info","low","medium","high","critical"].includes(record.severity) ? record.severity as StructuredExecutionResult["severity"] : undefined,
      title:typeof record.title==="string" ? record.title.trim() || undefined : undefined,
      impact:typeof record.impact==="string" ? record.impact.trim() || undefined : undefined,
      remediation:typeof record.remediation==="string" ? record.remediation.trim() || undefined : undefined,
      rootCause:typeof record.root_cause==="string" ? record.root_cause.trim() || undefined : typeof record.rootCause==="string" ? record.rootCause.trim() || undefined : undefined,
      reproduction:typeof record.reproduction==="string" ? record.reproduction.trim() || undefined : undefined,
      rootCause:typeof record.root_cause==="string" ? record.root_cause.trim() || undefined : typeof record.rootCause==="string" ? record.rootCause.trim() || undefined : undefined,
      reproduction:typeof record.reproduction==="string" ? record.reproduction.trim() || undefined : typeof record.steps_to_reproduce==="string" ? record.steps_to_reproduce.trim() || undefined : undefined,
      attemptId:typeof record.attempt_id==="string" ? record.attempt_id : typeof record.attemptId==="string" ? record.attemptId : undefined,
      requestId:typeof record.request_id==="string" ? record.request_id : typeof record.requestId==="string" ? record.requestId : undefined,
      responseId:typeof record.response_id==="string" ? record.response_id : typeof record.responseId==="string" ? record.responseId : undefined,
      resultSummary,
      evidence,
      observations,
    }
  }

  const evidence=[...text.matchAll(/evidence[_ -]?id\s*[:=]\s*([A-Za-z0-9._:-]+)/gi)].map(match=>({
    id:match[1],
    kind:"inference" as const,
    summary:"Referenced by subagent output",
    observed:false,
  }))
  const stateMatch=text.match(/(?:state|status)\s*[:=]\s*(executed|inconclusive|blocked|rejected|confirmed)/i)
  return {
    state:asState(stateMatch?.[1]?.toLowerCase(),fallback.state),
    outcome:fallback.outcome,
    resultSummary:text.trim(),
    evidence,
    observations:[],
  }
}
