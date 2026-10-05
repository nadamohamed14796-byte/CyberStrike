import { loadHuntingState, type HuntingState } from "./hunting-state"
import { loadCheckpoint, saveCheckpoint, type RuntimeCheckpoint } from "./runtime-checkpoint"
import { updateMission, type MissionState } from "./mission"

export async function resumeHunting(root:string,target:string):Promise<HuntingState>{
  const state = await loadHuntingState(root,target)
  return state
}

export async function checkpointHunting(
  root:string,
  state:HuntingState,
  phase:string,
):Promise<RuntimeCheckpoint>{
  const target = state.mission?.target ?? ""
  if (!target) throw new Error("CHECKPOINT_BLOCKED: mission target is missing")

  return saveCheckpoint(root,{
    target,
    missionState:state.mission?.state ?? "PAUSED",
    phase,
    activeHypothesisIds:state.hypotheses.hypotheses
      .filter(x=>x.status==="pending"||x.status==="testing")
      .map(x=>x.id),
    activeChainIds:state.chains.chains
      .filter(x=>x.status==="open"||x.status==="testing")
      .map(x=>x.id),
    completedAttemptIds:state.attempts.attempts
      .filter(x=>x.state==="executed"||x.state==="confirmed")
      .map(x=>x.id),
  })
}

export async function checkpointPhase(
  root:string,
  target:string,
  phase:string,
):Promise<RuntimeCheckpoint>{
  const state = await resumeHunting(root,target)
  return checkpointHunting(root,state,phase)
}

export async function transitionMissionAndCheckpoint(
  root:string,
  target:string,
  state:MissionState,
  phase:string,
):Promise<{ mission: Awaited<ReturnType<typeof updateMission>>; checkpoint: RuntimeCheckpoint }>{
  const mission = await updateMission(root,target,state,phase)
  const checkpoint = await checkpointPhase(root,target,phase)
  return { mission, checkpoint }
}

export async function resumeCheckpoint(root:string,target:string):Promise<RuntimeCheckpoint|null>{
  return loadCheckpoint(root,target)
}
