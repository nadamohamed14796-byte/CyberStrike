import z from "zod"
import { Tool } from "./tool"
import { VariantLedger } from "../methodology/variant-ledger"
export const RecordVariantTool = Tool.define("record_variant", {
  description: "Persist an endpoint/parameter test variant to prevent repeated testing across a target session.",
  parameters: z.object({ target: z.string(), endpoint: z.string(), parameter: z.string().optional(), variant: z.string(), account: z.string().optional(), role: z.string().optional(), result: z.string(), evidence: z.string().optional(), confidence: z.number().min(0).max(100).optional() }),
  async execute(params, ctx) {
    const existing = await VariantLedger.has(params.target, ctx.sessionID, params.endpoint, params.variant, params.account)
    if (existing) return { title: "Variant already recorded", output: "Skipped duplicate variant.", metadata: { deduplicated: true } }
    const record = await VariantLedger.record(params.target, ctx.sessionID, params)
    return { title: "Variant recorded", output: JSON.stringify(record), metadata: { deduplicated: false } }
  },
})