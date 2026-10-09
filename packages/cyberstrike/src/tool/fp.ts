import z from "zod"
import path from "path"
import { Tool } from "./tool"
import { Instance } from "../project/instance"
import * as FalsePositive from "../finding/fp"
import { fingerprint } from "../finding/lifecycle"

// False-positive memory for this project. Stored in the project's .cyberstrike
// folder, in the same SQLite file as the runtime learning state.
function file() {
  return path.join(Instance.directory, ".cyberstrike", "learning.db")
}

const Shape = z.object({
  target: z.string().describe("Target host, for example shop.example.com"),
  functionality: z.string().describe("Feature or area, for example invoices"),
  root: z.string().describe("Root cause in a few words"),
  method: z.string().describe("HTTP method, or N/A"),
  parameter: z.string().describe("Parameter or field involved, or N/A"),
  cls: z.string().describe("Vulnerability class, for example idor, xss, ssrf"),
  behavior: z.string().describe("The observed behavior, short and specific"),
})

export const FpCheckTool = Tool.define("fp_check", {
  description:
    "Before investigating a lead again, check whether the same behavior was already ruled out as a false positive on this target. A hit means do not repeat the investigation unless new evidence changes the context.",
  parameters: Shape,
  async execute(params) {
    const key = fingerprint(params)
    const entries = await FalsePositive.load(file())
    const hit = FalsePositive.lookup(entries, key)
    if (!hit) return { title: "fp_check", output: `no false-positive record for ${key}`, metadata: { fingerprint: key, hit: false } }
    return {
      title: "fp_check",
      output: `already ruled out (${hit.date}, confidence ${hit.confidence}): ${hit.reason}`,
      metadata: { fingerprint: key, hit: true },
    }
  },
})

export const FpRecordTool = Tool.define("fp_record", {
  description:
    "Record a lead that was ruled out as a false positive, with the reason and the evidence that ruled it out. Only record after the evidence is actually gathered. The first record for a fingerprint is kept.",
  parameters: Shape.extend({
    endpoint: z.string().describe("Endpoint path, for example /api/invoices/{id}"),
    reason: z.string().describe("Why it is not a vulnerability"),
    evidence: z.string().describe("The request/response evidence that ruled it out"),
    confidence: z.enum(["low", "medium", "high"]).describe("How sure the ruling is"),
  }),
  async execute(params) {
    const key = fingerprint(params)
    const entries = await FalsePositive.load(file())
    const next = FalsePositive.add(entries, {
      fingerprint: key,
      target: params.target,
      endpoint: params.endpoint,
      cls: params.cls,
      reason: params.reason,
      evidence: params.evidence,
      date: new Date().toISOString().slice(0, 10),
      confidence: params.confidence,
    })
    if (next.length === entries.length) return { title: "fp_record", output: `already recorded: ${key}`, metadata: { fingerprint: key } }
    await FalsePositive.save(file(), next)
    return { title: "fp_record", output: `recorded ${key}`, metadata: { fingerprint: key } }
  },
})
