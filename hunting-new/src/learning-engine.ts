export interface LearningObservation {
  target: string
  signal: string
  skill: string
  strategy: string
  outcome: "useful" | "false_positive" | "inconclusive" | "confirmed"
  confidence: number
  timestamp: string
}

export interface LearningScore {
  key: string
  observations: number
  useful: number
  falsePositives: number
  confirmed: number
  falsePositiveRate: number
  utility: number
}

export class LearningEngine {
  private readonly observations: LearningObservation[] = []

  record(observation: Omit<LearningObservation, "timestamp">): LearningObservation {
    const item = { ...observation, confidence: Math.max(0, Math.min(1, observation.confidence)), timestamp: new Date().toISOString() }
    this.observations.push(item)
    return item
  }

  list(target?: string): LearningObservation[] {
    return target ? this.observations.filter(x => x.target === target) : [...this.observations]
  }

  score(target?: string): LearningScore[] {
    const groups = new Map<string, LearningObservation[]>()
    for (const item of this.list(target)) {
      const key = `${item.signal}|${item.skill}|${item.strategy}`
      const group = groups.get(key) ?? []
      group.push(item)
      groups.set(key, group)
    }

    return [...groups.entries()].map(([key, items]) => {
      const useful = items.filter(x => x.outcome === "useful").length
      const falsePositives = items.filter(x => x.outcome === "false_positive").length
      const confirmed = items.filter(x => x.outcome === "confirmed").length
      const observations = items.length
      const falsePositiveRate = falsePositives / observations
      const utility = (confirmed * 1 + useful * .6 + items.filter(x => x.outcome === "inconclusive").length * .1 - falsePositives * .8) / observations
      return { key, observations, useful, falsePositives, confirmed, falsePositiveRate, utility }
    }).sort((a, b) => b.utility - a.utility)
  }

  recommendedStrategies(target: string, signal: string, limit = 5): string[] {
    return this.score(target)
      .filter(x => x.key.startsWith(signal + "|"))
      .slice(0, limit)
      .map(x => x.key.split("|")[2])
  }
}
