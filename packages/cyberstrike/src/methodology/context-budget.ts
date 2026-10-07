export type ContextPhase = "recon" | "js" | "understand" | "parameter_discovery" | "hunting" | "validation" | "reporting"
export type ContextBudget = { tokens: number; maxItems: number; maxItemChars: number }
export type ContextItem = { id: string; text: string; score?: number; phase?: ContextPhase; metadata?: Record<string, unknown> }
const DEFAULTS: Record<ContextPhase, ContextBudget> = {
  recon: { tokens: 6000, maxItems: 80, maxItemChars: 1800 },
  js: { tokens: 7000, maxItems: 60, maxItemChars: 2200 },
  understand: { tokens: 5000, maxItems: 50, maxItemChars: 2200 },
  parameter_discovery: { tokens: 4000, maxItems: 50, maxItemChars: 1600 },
  hunting: { tokens: 9000, maxItems: 80, maxItemChars: 2400 },
  validation: { tokens: 7000, maxItems: 50, maxItemChars: 2600 },
  reporting: { tokens: 5000, maxItems: 40, maxItemChars: 2400 },
}
function estimateTokens(text: string) { return Math.max(1, Math.ceil(text.length / 4)) }
export namespace ContextBudgetManager {
  export function budget(phase: ContextPhase): ContextBudget { return { ...DEFAULTS[phase] } }
  export function prioritize(items: ContextItem[], phase: ContextPhase, override?: Partial<ContextBudget>) {
    const budget = { ...DEFAULTS[phase], ...(override ?? {}) }
    const unique = new Map<string, ContextItem>()
    for (const item of items) {
      const key = item.id.trim() || item.text.trim()
      if (!key) continue
      const previous = unique.get(key)
      if (!previous || (item.score ?? 0) > (previous.score ?? 0)) unique.set(key, item)
    }
    const ranked = [...unique.values()].map((item) => ({ ...item, text: item.text.slice(0, budget.maxItemChars) })).sort((a,b) => (b.score ?? 0) - (a.score ?? 0))
    const selected: ContextItem[] = []
    let used = 0
    for (const item of ranked) {
      if (selected.length >= budget.maxItems) break
      const cost = estimateTokens(item.text)
      if (used + cost > budget.tokens) continue
      selected.push(item); used += cost
    }
    return { phase, selected, dropped: ranked.length - selected.length, estimatedTokens: used, budget }
  }
  export function summarize(phase: ContextPhase, items: ContextItem[]) {
    const result = prioritize(items, phase)
    return { ...result, text: result.selected.map((item) => `[${item.id}] ${item.text}`).join("\n") }
  }
}