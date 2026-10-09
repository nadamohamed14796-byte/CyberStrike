import type { HypothesisRecord } from "./hypotheses"

export type ChainStatus = "open" | "testing" | "confirmed" | "rejected" | "blocked"

export interface ChainNode {
  id: string
  hypothesisId: string
  role: "entry" | "pivot" | "impact" | "evidence"
  evidenceIds: string[]
}

export interface Chain {
  id: string
  title: string
  status: ChainStatus
  hypothesisIds: string[]
  nodes: ChainNode[]
  score: number
}

export class ChainBoard {
  private readonly chains = new Map<string, Chain>()

  create(title: string, hypotheses: HypothesisRecord[]): Chain {
    const ids = hypotheses.map(x => x.id)
    const id = "chain_" + Bun.hash(title + "|" + ids.join("|")).toString(16)
    const existing = this.chains.get(id)
    if (existing) return existing

    const nodes: ChainNode[] = hypotheses.map((h, i) => ({
      id: "node_" + h.id,
      hypothesisId: h.id,
      role: i === 0 ? "entry" : "pivot",
      evidenceIds: [...h.evidenceIds],
    }))

    const chain: Chain = {
      id,
      title,
      status: "open",
      hypothesisIds: ids,
      nodes,
      score: hypotheses.reduce((sum, h) => sum + h.confidence, 0) / Math.max(1, hypotheses.length),
    }
    this.chains.set(id, chain)
    return chain
  }

  addEvidence(chainId: string, nodeId: string, evidenceId: string): Chain {
    const chain = this.chains.get(chainId)
    if (!chain) throw new Error("CHAIN_NOT_FOUND")
    const node = chain.nodes.find(x => x.id === nodeId)
    if (!node) throw new Error("CHAIN_NODE_NOT_FOUND")
    if (!node.evidenceIds.includes(evidenceId)) node.evidenceIds.push(evidenceId)
    return chain
  }

  updateStatus(chainId: string, status: ChainStatus): Chain {
    const chain = this.chains.get(chainId)
    if (!chain) throw new Error("CHAIN_NOT_FOUND")
    chain.status = status
    return chain
  }

  list(status?: ChainStatus): Chain[] {
    const all = [...this.chains.values()]
    return status ? all.filter(x => x.status === status) : all
  }
}
