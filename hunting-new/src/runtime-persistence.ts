import { loadHuntingState, type HuntingState } from "./hunting-state"
import { loadCheckpoint, saveCheckpoint, type RuntimeCheckpoint } from "./runtime-checkpoint"
import { loadTaskStates } from "./task-state-store"
import { updateMission, type MissionState } from "./mission"
import type { HypothesisRecord } from "./hypotheses"
import type { Chain } from "./chain-board"
import type { TaskStateRecord } from "./task-state"

export async function resumeHunting(root:string,target:string):Promise<HuntingState>{
  return loadHuntingState(root,target)
}

export interface ResumeContext {
  state:HuntingState
  checkpoint:RuntimeCheckpoint|null
  activeHypotheses:HypothesisRecord[]
  activeChains:Chain[]
  activeTasks:TaskStateRecord[]
  nextAttemptNumber:Record<string,number>
  resumePhase:string
}

export async function resumeHuntingContext(root:string,target:string):Promise<ResumeContext>{
  const [state,checkpoint,tasks]=await Promise.all([
    loadHuntingState(root,target),
    loadCheckpoint(root,target),
    loadTaskStates(root,target),
  ])

  const activeHypotheses=state.hypotheses.hypotheses.filter(x =>
    (x.status==="pending" || x.status==="testing") &&
    (!checkpoint?.activeHypothesisIds.length || checkpoint.activeHypothesisIds.includes(x.id))
  )
  const activeChains=state.chains.chains.filter(x =>
    (x.status==="open" || x.status==="testing") &&
    (!checkpoint?.activeChainIds.length || checkpoint.activeChainIds.includes(x.id))
  )
  const activeTasks=tasks.tasks.filter(x =>
    x.state==="pending" || x.state==="claimed" || x.state==="running"
  )

  const nextAttemptNumber:Record<string,number>={}
  for(const hypothesis of activeHypotheses){
    nextAttemptNumber[hypothesis.id]=
      state.attempts.attempts.filter(x=>x.hypothesisId===hypothesis.id).length+1
  }

  return {
    state,
    checkpoint,
    activeHypotheses,
    activeChains,
    activeTasks,
    nextAttemptNumber,
    resumePhase:checkpoint?.phase ?? state.mission?.checkpoint ?? "initial",
  }
}

export function selectNextHypothesis(context:ResumeContext):HypothesisRecord|undefined{
  return [...context.activeHypotheses].sort((a,b)=>{
    const ar=a.status==="testing"?0:1
    const br=b.status==="testing"?0:1
    const aa=context.nextAttemptNumber[a.id]??1
    const ba=context.nextAttemptNumber[b.id]??1
    return ar-br || aa-ba || a.id.localeCompare(b.id)
  })[0]
}

export function selectNextTask(context:ResumeContext):TaskStateRecord|undefined{
  return [...context.activeTasks].sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt))[0]
}

export async function checkpointHunting(
  root:string,
  state:HuntingState,
  phase:string,
):Promise<RuntimeCheckpoint>{
  const target=state.mission?.target ?? ""
  if(!target) throw new Error("CHECKPOINT_BLOCKED: mission target is missing")
  const tasks=await loadTaskStates(root,target)
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
    activeTaskIds:tasks.tasks
      .filter(x=>x.state==="pending"||x.state==="claimed"||x.state==="running")
      .map(x=>x.taskId),
    completedTaskIds:tasks.tasks
      .filter(x=>x.state==="completed")
      .map(x=>x.taskId),
  })
}

export async function checkpointPhase(root:string,target:string,phase:string):Promise<RuntimeCheckpoint>{
  return checkpointHunting(root,await resumeHunting(root,target),phase)
}

export async function transitionMissionAndCheckpoint(
  root:string,target:string,state:MissionState,phase:string,
):Promise<{mission:Awaited<ReturnType<typeof updateMission>>;checkpoint:RuntimeCheckpoint}>{
  const mission=await updateMission(root,target,state,phase)
  const checkpoint=await checkpointPhase(root,target,phase)
  return {mission,checkpoint}
}

export async function resumeCheckpoint(root:string,target:string):Promise<RuntimeCheckpoint|null>{
  return loadCheckpoint(root,target)
}
