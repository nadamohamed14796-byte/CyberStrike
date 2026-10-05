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
  ].join("\n")
}

export function parseExecutionResult(
  text:string,
  fallback:Pick<StructuredExecutionResult,"state"|"outcome">,
):StructuredExecutionResult{
  const evidence=[...text.matchAll(/evidence[_ -]?id\\s*[:=]\\s*([A-Za-z0-9._:-]+)/gi)].map(match=>({
    id:match[1],
    kind:"inference" as const,
    summary:"Referenced by subagent output",
    observed:false,
  }))
  const stateMatch=text.match(/(?:state|status)\\s*[:=]\\s*(executed|inconclusive|blocked|rejected|confirmed)/i)
  const state=(stateMatch?.[1]?.toLowerCase() as StructuredExecutionResult["state"]) ?? fallback.state
  return {
    state,
    outcome:fallback.outcome,
    resultSummary:text.trim(),
    evidence,
    observations:[],
  }
}
