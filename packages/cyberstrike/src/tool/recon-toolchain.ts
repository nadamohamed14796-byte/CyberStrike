import z from "zod"
import { Tool } from "./tool"

import { EXTERNAL_TOOLS, type ExternalToolRisk, type ExternalToolSpec } from "./external-tool-registry"

export type { ExternalToolRisk, ExternalToolSpec }
const TOOLS = EXTERNAL_TOOLS
function normalize(value: string) {
  return value.trim().toLowerCase().replace(/_/g, "-")
}

export function planReconTools(input: { signal: string; target?: string; authorized_active_testing?: boolean; max_tools?: number }) {
  const signal = normalize(input.signal)
  const max = Math.max(1, Math.min(8, input.max_tools ?? 3))
  const matches = TOOLS
    .filter((tool) => tool.when.some((x) => normalize(x).includes(signal) || signal.includes(normalize(x))))
    .filter((tool) => input.authorized_active_testing === true || (tool.risk !== "active-test" && tool.risk !== "high-impact"))
    .slice(0, max)
  const ordered = matches.length ? matches : TOOLS.filter((tool) => tool.risk === "passive").slice(0, max)
  return ordered.map((tool) => ({
    id: tool.id,
    phase: tool.phase,
    risk: tool.risk,
    command: tool.command,
  }))
}

export const ReconToolchainTool = Tool.define("recon_toolchain", {
  description:
    "Choose the next reconnaissance/security tool from a signal. Returns a safe, ordered execution plan; it does not execute commands. Always perform scope_check before active testing. High-impact tools require explicit authorization.",
  parameters: z.object({
    signal: z.string().min(1).describe("Observed signal, such as 'live HTTP', 'GraphQL', 'JWT', or 'SQL-like behavior'"),
    target: z.string().min(1).describe("In-scope target or input artifact"),
    phase: z.string().optional().describe("Current phase, if known"),
    max_tools: z.number().int().min(1).max(8).default(3),
    authorized_active_testing: z.boolean().default(false).describe("Explicit authorization for active/high-impact testing"),
  }),
  async execute(params) {
    const ordered = planReconTools(params)
    const lines = [
      "target: " + params.target,
      "signal: " + params.signal,
      "phase: " + (params.phase ?? "auto"),
      "scope_required: true",
      "active_authorization: " + (params.authorized_active_testing ? "granted" : "not-granted"),
      "",
      "NEXT TOOLS",
      ...ordered.map((tool, i) => (i + 1) + ". " + tool.id + " | phase=" + tool.phase + " | risk=" + tool.risk + " | " + tool.command),
      "",
      "RULES",
      "- Run scope_check before touching a new target.",
      "- Prefer passive/read-only discovery before active testing.",
      "- Treat scanner output as a lead, never as a finding.",
      "- Preserve command/input/output provenance.",
      "- Do not auto-run high-impact tools without explicit authorization.",
    ]
    return { title: "Recon plan: " + params.signal, output: lines.join("\\n"), metadata: { tools: ordered.map((x) => x.id), target: params.target } }
  },
})
