import { loadHuntingState, type HuntingState } from "./hunting-state"
import { saveCheckpoint, type RuntimeCheckpoint } from "./runtime-checkpoint"

export async function resumeHunting(root:string,target:string):Promise<HuntingState>{
  return loadHuntingState(root,target)
}

export async function checkpointHunting(
  root:string,
  state:HuntingState,
  phase:string,
):Promise<RuntimeCheckpoint>{
  return saveCheckpoint(root,{
    target:state.mission?.target??"",
    missionState:state.mission?.state??"PAUSED",
    phase,
    activeHypothesisIds:state.hypotheses.hypotheses.filter(x=>x.status==="pending"||x.status==="testing").map(x=>x.id),
    activeChainIds:state.chains.chains.filter(x=>x.status==="open"||x.status==="testing").map(x=>x.id),
    completedAttemptIds:state.attempts.attempts.filter(x=>x.state==="executed"||x.state==="confirmed").map(x=>x.id),
  })
}
