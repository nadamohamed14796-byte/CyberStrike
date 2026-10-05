export type AttemptState = "planned" | "blocked" | "executed" | "inconclusive" | "confirmed" | "rejected"

export type StrategyClass = "parameter" | "encoding" | "method" | "content-type" | "request-shape" | "account-context" | "identifier" | "path" | "header" | "workflow" | "parser" | "alternate-client"

export interface Attempt {
  id: string
  hypothesisId: string
  strategy: StrategyClass
  variant: string
  reason: string
  state: AttemptState
  requestId?: string
  resultSummary?: string
  evidenceIds: string[]
  createdAt: number
}

export interface AttemptPolicy {
  maxAttempts: number
  stopOnConfirmation: boolean
  stopOnRejection: boolean
  requireDistinctVariants: boolean
}

const DEFAULT_POLICY: AttemptPolicy = {
  maxAttempts: 20,
  stopOnConfirmation: true,
  stopOnRejection: true,
  requireDistinctVariants: true,
}

export class AttemptLedger {
  private readonly attempts = new Map<string, Attempt[]>()
  private readonly policy: AttemptPolicy

  constructor(policy: Partial<AttemptPolicy> = {}) {
    this.policy = { ...DEFAULT_POLICY, ...policy }
  }

  plan(hypothesisId: string, strategy: StrategyClass, variant: string, reason: string): Attempt | undefined {
    const current = this.attempts.get(hypothesisId) ?? []
    if (current.length >= this.policy.maxAttempts) return undefined
    if (this.policy.requireDistinctVariants && current.some(a => a.variant === variant)) return undefined
    if (current.some(a => a.state === "confirmed" && this.policy.stopOnConfirmation)) return undefined
    if (current.some(a => a.state === "rejected" && this.policy.stopOnRejection)) return undefined

    const attempt: Attempt = {
      id: `attempt-${hypothesisId}-${current.length + 1}`,
      hypothesisId,
      strategy,
      variant,
      reason,
      state: "planned",
      evidenceIds: [],
      createdAt: Date.now(),
    }
    this.attempts.set(hypothesisId, [...current, attempt])
    return attempt
  }

  record(id: string, update: Partial<Pick<Attempt, "state" | "requestId" | "resultSummary">> & { evidenceIds?: string[] }): Attempt {
    for (const list of this.attempts.values()) {
      const attempt = list.find(a => a.id === id)
      if (attempt) {
        Object.assign(attempt, update)
        if (update.evidenceIds) attempt.evidenceIds = [...new Set(update.evidenceIds)]
        return attempt
      }
    }
    throw new Error(`Unknown attempt: ${id}`)
  }

  list(hypothesisId: string): Attempt[] {
    return [...(this.attempts.get(hypothesisId) ?? [])]
  }

  remaining(hypothesisId: string): number {
    return Math.max(0, this.policy.maxAttempts - this.list(hypothesisId).length)
  }
}
