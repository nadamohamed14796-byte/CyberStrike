import { loadHuntingState, type HuntingState } from "./hunting-state"
import { checkpointHunting } from "./runtime-persistence"
import { updateMission, type MissionState } from "./mission"
import { appendEvent } from "./store"

export interface PhaseTransition {
  phase: string
  state: MissionState
  checkpointId: string
}

export async function checkpointPhase(
  root: string,
  target: string,
  phase: string,
  state?: HuntingState,
): Promise<PhaseTransition> {
  const current = state ?? await loadHuntingState(root, target)
  const checkpoint = await checkpointHunting(root, current, phase)
  await appendEvent(root, target, {
    type: "mission.phase",
    phase,
    missionState: checkpoint.missionState,
    timestamp: checkpoint.updatedAt,
  })
  return {
    phase,
    state: checkpoint.missionState,
    checkpointId: checkpoint.updatedAt,
  }
}

export async function transitionMissionAndCheckpoint(
  root: string,
  target: string,
  state: MissionState,
  phase: string,
): Promise<PhaseTransition> {
  await updateMission(root, target, state)
  return checkpointPhase(root, target, phase)
}

export async function checkpointAfterAttempt(
  root: string,
  target: string,
  attemptId: string,
  phase = "VALIDATION",
): Promise<PhaseTransition> {
  const state = await loadHuntingState(root, target)
  await appendEvent(root, target, {
    type: "attempt.completed",
    attemptId,
    timestamp: new Date().toISOString(),
  })
  return checkpointPhase(root, target, phase, state)
}
