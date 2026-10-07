import z from "zod"
import { Tool } from "./tool"
import { FindingGate } from "../methodology/finding-gate"

export const ValidateFindingTool = Tool.define("validate_finding", {
  description: "Run the deterministic ten-requirement finding gate and return requirement-level evidence, failures, and next actions.",
  parameters: z.object({ finding_id: z.string(), scope_items: z.array(z.string()).default([]) }),
  async execute(params, ctx) {
    const result = FindingGate.validate(ctx.sessionID, params.finding_id, params.scope_items)
    const lines = [result.passed ? "VALIDATION PASSED" : "VALIDATION FAILED"]
    for (const r of result.requirements) lines.push(`${r.passed ? "[PASS]" : "[FAIL]"} #${r.id} ${r.name}${r.reason ? ` — ${r.reason}` : ""}`)
    return {
      title: result.passed ? `Finding ${params.finding_id} validated` : `Finding ${params.finding_id} blocked`,
      output: lines.join("\n"),
      metadata: { findingID: result.findingID, passed: result.passed, requirements: result.requirements },
    }
  },
})