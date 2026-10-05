import { PersistentAttemptLedger } from "./persistent-attempt-ledger"
import { transitionHypothesis } from "./hypothesis-store"
import { transitionChain, loadChains } from "./chain-store"
import { loadHypotheses } from "./hypothesis-store"
import { checkpointPhase } from "./runtime-persistence"
import type { AttemptState } from "./adaptive-attempts"

export interface AttemptLifecycleResult {
  attemptState: AttemptState
  hypothesisStatus: "pending"|"testing"|"confirmed"|"rejected"|"blocked"
  chainStatuses: Record<string, "open"|"testing"|"confirmed"|"rejected"|"blocked">
}

export async function recordAttemptLifecycle(
  root:string,
  target:string,
  attemptId:string,
  update:{state:AttemptState;requestId?:string;resultSummary?:string;evidenceIds?:string[]},
):Promise<AttemptLifecycleResult>{
  const stored=await import("./attempt-store").then(x=>x.loadAttempts(root,target))
  const attempt=stored.attempts.find(x=>x.id===attemptId)
  if(!attempt) throw new Error("ATTEMPT_NOT_FOUND")

  const ledger=await PersistentAttemptLedger.create(root,target,{maxAttempts:20})
  const recorded=await ledger.record(attemptId,update)

  const hypotheses=await loadHypotheses(root,target)
  const hypothesis=hypotheses.hypotheses.find(x=>x.id===recorded.hypothesisId)
  if(!hypothesis) throw new Error("HYPOTHESIS_NOT_FOUND")

  let hypothesisStatus:"pending"|"testing"|"confirmed"|"rejected"|"blocked" = "testing"
  if(recorded.state==="confirmed") hypothesisStatus="confirmed"
  else if(recorded.state==="rejected") hypothesisStatus="rejected"
  else if(recorded.state==="blocked") hypothesisStatus="blocked"

  await transitionHypothesis(
    root,target,hypothesis.id,hypothesisStatus,
    recorded.evidenceIds.length ? [...new Set([...hypothesis.evidenceIds,...recorded.evidenceIds])] : undefined,
  )

  const chains=await loadChains(root,target)
  const chainStatuses:AttemptLifecycleResult["chainStatuses"]={}
  for(const chain of chains.chains.filter(x=>x.hypothesisIds.includes(hypothesis.id))){
    let status=chain.status
    if(hypothesisStatus==="confirmed") status="confirmed"
    else if(hypothesisStatus==="rejected" && chain.hypothesisIds.length===1) status="rejected"
    else if(hypothesisStatus==="testing" && status==="open") status="testing"
    if(status!==chain.status) await transitionChain(root,target,chain.id,status)
    chainStatuses[chain.id]=status
  }

  await checkpointPhase(root,target,"validation:state-transition")
  return {attemptState:recorded.state,hypothesisStatus,chainStatuses}
}
