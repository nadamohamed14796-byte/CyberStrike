import { loadAttempts, type AttemptState } from "./attempt-store"
import { loadChains, type ChainState } from "./chain-store"
import { loadHypotheses, type HypothesisState } from "./hypothesis-store"
import { loadLearning, type LearningState } from "./learning-store"
import { loadEvidence, type EvidenceState } from "./evidence-store"
import { loadFindings, type FindingState } from "./finding-store"
import { loadFalsePositives, type FalsePositiveState } from "./false-positive-store"
import { loadOob, type OobStateStore } from "./oob"
import { loadMission, type Mission } from "./mission"

export interface HuntingState {
  mission: Mission | null
  hypotheses: HypothesisState
  chains: ChainState
  attempts: AttemptState
  learning: LearningState
  evidence: EvidenceState
  findings: FindingState
  falsePositives: FalsePositiveState
  oob: OobStateStore
}

export async function loadHuntingState(root: string, target: string): Promise<HuntingState> {
  const [mission, hypotheses, chains, attempts, learning, evidence, findings, falsePositives, oob] = await Promise.all([
    loadMission(root, target),
    loadHypotheses(root, target),
    loadChains(root, target),
    loadAttempts(root, target),
    loadLearning(root, target),
    loadEvidence(root, target),
    loadFindings(root, target),
    loadFalsePositives(root, target),
    loadOob(root, target),
  ])
  return { mission, hypotheses, chains, attempts, learning, evidence, findings, falsePositives, oob }
}
