import { EXTERNAL_TOOLS } from "./external-tool-registry"

export type PlannedReconTool = {
  id: string
  phase: string
  risk: (typeof EXTERNAL_TOOLS)[number]["risk"]
  command: string
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/_/g, "-")
}

/**
 * Select a small deterministic external-tool plan from an observed signal.
 * Kept separate from the Tool wrapper so learning/dispatch code cannot create
 * a Tool -> Learning -> planner -> Tool initialization cycle.
 */
export function planReconTools(input: {
  signal: string
  target?: string
  authorized_active_testing?: boolean
  max_tools?: number
}): PlannedReconTool[] {
  const signal = normalize(input.signal)
  const max = Math.max(1, Math.min(8, input.max_tools ?? 3))
  const matches = EXTERNAL_TOOLS
    .filter((tool) => tool.when.some((x) => {
      const candidate = normalize(x)
      return candidate === signal || signal.split(/\s+/).some((term) => term.length >= 4 && candidate.split(/\s+/).includes(term))
    }))
    .filter((tool) => input.authorized_active_testing === true || (tool.risk !== "active-test" && tool.risk !== "high-impact"))
    .slice(0, max)
  const ordered = matches.length ? matches : EXTERNAL_TOOLS.filter((tool) => tool.risk === "passive").slice(0, max)
  return ordered.map((tool) => ({ id: tool.id, phase: tool.phase, risk: tool.risk, command: tool.command }))
}
