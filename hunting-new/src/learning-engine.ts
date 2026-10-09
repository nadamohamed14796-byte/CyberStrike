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

  static fromObservations(observations: LearningObservation[]): LearningEngine {
    const engine = new LearningEngine()
    engine.observations.push(...observations.map(item => ({
      ...item,
      confidence: Math.max(0, Math.min(1, item.confidence)),
    })))
    return engine
  }

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
      const weight=(item:LearningObservation)=>Math.max(0,Math.min(1,item.confidence))
      const useful = items.filter(x => x.outcome === "useful").length
      const falsePositives = items.filter(x => x.outcome === "false_positive").length
      const confirmed = items.filter(x => x.outcome === "confirmed").length
      const totalWeight = Math.max(1, items.reduce((sum,item)=>sum+weight(item),0))
      const weightedConfirmed = items.filter(x=>x.outcome==="confirmed").reduce((sum,item)=>sum+weight(item),0)
      const weightedUseful = items.filter(x=>x.outcome==="useful").reduce((sum,item)=>sum+weight(item),0)
      const weightedInconclusive = items.filter(x=>x.outcome==="inconclusive").reduce((sum,item)=>sum+weight(item),0)
      const weightedFalsePositives = items.filter(x=>x.outcome==="false_positive").reduce((sum,item)=>sum+weight(item),0)
      const observations = items.length
      const falsePositiveRate = weightedFalsePositives / totalWeight
      const utility = (weightedConfirmed + weightedUseful * .6 + weightedInconclusive * .1 - weightedFalsePositives * .8) / totalWeight
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
