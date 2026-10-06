import z from "zod"
import { Tool } from "./tool"
import { SignalQueue } from "./signal-queue"

export const CoverageMatrixTool = Tool.define("coverage_matrix", {
  description:
    "Inspect investigation coverage for the current session across target, phase, signal, and tool. Use it to avoid repeating completed work and to identify uncovered phases.",
  parameters: z.object({
    sessionID: z.string().min(1),
    limit: z.number().int().min(1).max(1000).default(500),
  }),
  async execute(params) {
    const matrix = SignalQueue.matrix(params.sessionID, params.limit)
    const coverage = SignalQueue.coverage(params.sessionID)
    return {
      title: "Coverage matrix",
      output: [
        "TARGETS: " + matrix.targets,
        "ENTRIES: " + matrix.total,
        "COMPLETED: " + coverage.completed,
        "PENDING: " + coverage.pending,
        "RUNNING: " + coverage.running,
        "",
        "COMPLETED PHASES",
        ...coverage.phases.map((phase) => "- " + phase),
        "",
        "COVERAGE ENTRIES",
        ...matrix.entries.slice(0, 200).map((entry) => "- " + entry),
      ].join("\n"),
      metadata: matrix,
    }
  },
})
