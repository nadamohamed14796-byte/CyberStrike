import { loadAttempts, type AttemptState } from "./attempt-store"
import { loadChains, type ChainState } from "./chain-store"
import { loadHypotheses, type HypothesisState } from "./hypothesis-store"
import { loadLearning, type LearningState } from "./learning-store"
import { loadMission, type Mission } from "./mission"

export interface HuntingState {
  mission: Mission | null
  hypotheses: HypothesisState
  chains: ChainState
  attempts: AttemptState
  learning: LearningState
}

export async function loadHuntingState(root: string, target: string): Promise<HuntingState> {
  const [mission, hypotheses, chains, attempts, learning] = await Promise.all([
    loadMission(root, target),
    loadHypotheses(root, target),
    loadChains(root, target),
    loadAttempts(root, target),
    loadLearning(root, target),
  ])
  return { mission, hypotheses, chains, attempts, learning }
}
