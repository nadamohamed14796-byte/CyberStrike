import type { Signal } from "./signals"

export type HypothesisStatus = "pending" | "testing" | "confirmed" | "rejected" | "blocked"

export interface HypothesisRecord {
  id: string
  title: string
  signal: string
  target: string
  endpoint?: string
  functionId?: string
  confidence: number
  status: HypothesisStatus
  evidenceIds: string[]
  createdAt: string
}

export class HypothesisStore {
  private readonly items = new Map<string, HypothesisRecord>()

  add(input: Omit<HypothesisRecord, "id" | "createdAt">): HypothesisRecord {
    const id = "hyp_" + Bun.hash([
      input.signal, input.target, input.endpoint ?? "", input.functionId ?? ""
    ].join("|")).toString(16)
    const existing = this.items.get(id)
    if (existing) return existing
    const item = { ...input, id, createdAt: new Date().toISOString() }
    this.items.set(id, item)
    return item
  }

  fromSignal(signal: Signal): HypothesisRecord {
    return this.add({
      title: `${signal.signal} signal requires validation`,
      signal: signal.signal,
      target: signal.target,
      endpoint: signal.endpoint,
      functionId: signal.function_id,
      confidence: signal.confidence,
      status: "pending",
      evidenceIds: [],
    })
  }

  list(status?: HypothesisStatus): HypothesisRecord[] {
    const all = [...this.items.values()]
    return status ? all.filter(x => x.status === status) : all
  }

  updateStatus(id: string, status: HypothesisStatus, evidenceIds?: string[]): HypothesisRecord {
    const item = this.items.get(id)
    if (!item) throw new Error("HYPOTHESIS_NOT_FOUND")
    const next = { ...item, status, evidenceIds: evidenceIds ?? item.evidenceIds }
    this.items.set(id, next)
    return next
  }
}
