import crypto from "node:crypto"

export interface FalsePositiveContext {
  target: string
  signal: string
  skill: string
  strategy: string
  endpoint?: string
  accountMode?: string
  reason: string
  evidenceIds?: string[]
  confidence: number
  timestamp?: string
}

export interface FalsePositiveRecord extends FalsePositiveContext {
  fingerprint: string
  firstSeen: string
  lastSeen: string
  count: number
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\\/+$/g, "").replace(/\\s+/g, " ")
}

export function falsePositiveFingerprint(input: Pick<FalsePositiveContext, "target"|"signal"|"skill"|"strategy"|"endpoint"|"accountMode">): string {
  const canonical = [
    normalize(input.target),
    normalize(input.signal),
    normalize(input.skill),
    normalize(input.strategy),
    normalize(input.endpoint),
    normalize(input.accountMode),
  ].join("|")
  return crypto.createHash("sha256").update(canonical).digest("hex")
}

export class FalsePositiveIntelligence {
  private readonly records = new Map<string, FalsePositiveRecord>()

  record(input: FalsePositiveContext): FalsePositiveRecord {
    const now = input.timestamp ?? new Date().toISOString()
    const fingerprint = falsePositiveFingerprint(input)
    const existing = this.records.get(fingerprint)
    if (existing) {
      existing.lastSeen = now
      existing.count += 1
      existing.reason = input.reason
      existing.confidence = Math.max(existing.confidence, Math.min(1, input.confidence))
      existing.evidenceIds = [...new Set([...(existing.evidenceIds ?? []), ...(input.evidenceIds ?? [])])]
      return { ...existing, evidenceIds: [...(existing.evidenceIds ?? [])] }
    }

    const record: FalsePositiveRecord = {
      ...input,
      confidence: Math.max(0, Math.min(1, input.confidence)),
      fingerprint,
      firstSeen: now,
      lastSeen: now,
      count: 1,
    }
    this.records.set(fingerprint, record)
    return { ...record, evidenceIds: [...(record.evidenceIds ?? [])] }
  }

  isKnown(input: Pick<FalsePositiveContext, "target"|"signal"|"skill"|"strategy"|"endpoint"|"accountMode">): boolean {
    return this.records.has(falsePositiveFingerprint(input))
  }

  get(input: Pick<FalsePositiveContext, "target"|"signal"|"skill"|"strategy"|"endpoint"|"accountMode">): FalsePositiveRecord | undefined {
    const item = this.records.get(falsePositiveFingerprint(input))
    return item ? { ...item, evidenceIds: [...(item.evidenceIds ?? [])] } : undefined
  }

  list(target?: string): FalsePositiveRecord[] {
    const values = [...this.records.values()]
    return (target ? values.filter(x => x.target === target) : values)
      .map(x => ({ ...x, evidenceIds: [...(x.evidenceIds ?? [])] }))
  }

  penalty(input: Pick<FalsePositiveContext, "target"|"signal"|"skill"|"strategy"|"endpoint"|"accountMode">): number {
    const item = this.get(input)
    if (!item) return 0
    return Math.min(1, 0.25 + Math.min(0.5, item.count * 0.05))
  }
}
