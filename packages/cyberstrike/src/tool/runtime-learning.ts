import z from "zod"
import { Tool } from "./tool"
import { Instance } from "../project/instance"
import * as Runtime from "../learning/runtime"
import { route } from "../skill/route"

export const SignalScoreTool = Tool.define("signal_score", {
  description:
    "Score a signal from 0 to 10 using what this project's past triage outcomes show. Use it during testing to decide which signal to pursue first. Unseen signals score 5.",
  parameters: z.object({ signal: z.string().describe("Signal name, for example jwt_detected") }),
  async execute(params) {
    const store = await Runtime.load(Runtime.file(Instance.directory))
    const value = Runtime.score(store, params.signal)
    return { title: "signal_score", output: `${params.signal}: ${value}/10`, metadata: { signal: params.signal, score: value } }
  },
})

export const ReconPlanTool = Tool.define("recon_plan", {
  description:
    "Before recon, list the signals this project has learned about, highest score first, with the skills each one routes to. Use it to choose what to look for first. Signals with no history are not listed here.",
  parameters: z.object({}),
  async execute() {
    const store = await Runtime.load(Runtime.file(Instance.directory))
    const list = Runtime.plan(store)
    const output = list.length
      ? list.map((item) => `${item.signal}: ${item.score}/10 -> ${route([item.signal]).join(", ") || "no skill"}`).join("\n")
      : "No learned signals yet. Start with the default recon order."
    return { title: "recon_plan", output, metadata: { count: list.length } }
  },
})

export const FindingRecordTool = Tool.define("finding_record", {
  description:
    "Record a candidate finding after it is reproduced, with the signals that led to it. Records start as candidate until triaged. Do not record a finding that has not been reproduced.",
  parameters: z.object({
    id: z.string().describe("Stable id for the finding, for example the dedupe fingerprint"),
    title: z.string(),
    cls: z.string().describe("Vulnerability class"),
    signals: z.array(z.string()).describe("Signals that led to this finding"),
    severity: z.enum(["critical", "high", "medium", "low", "info"]),
  }),
  async execute(params) {
    const filepath = Runtime.file(Instance.directory)
    const store = await Runtime.load(filepath)
    const next = Runtime.addFinding(store, params)
    if (next === store) return { title: "finding_record", output: `already recorded: ${params.id}`, metadata: { id: params.id } }
    await Runtime.save(filepath, next)
    return { title: "finding_record", output: `recorded candidate ${params.id}`, metadata: { id: params.id } }
  },
})

export const FindingTriageTool = Tool.define("finding_triage", {
  description:
    "Record the triage outcome of a candidate finding: accepted by the program, fp (false positive), or duplicate. This updates the scores of the signals that led to it.",
  parameters: z.object({
    id: z.string(),
    outcome: z.enum(["accepted", "fp", "duplicate"]),
  }),
  async execute(params) {
    const filepath = Runtime.file(Instance.directory)
    const store = await Runtime.load(filepath)
    const next = Runtime.triage(store, params.id, params.outcome)
    if (next === store) return { title: "finding_triage", output: `no open candidate with id ${params.id}`, metadata: { id: params.id } }
    await Runtime.save(filepath, next)
    return { title: "finding_triage", output: `${params.id} marked ${params.outcome}`, metadata: { id: params.id } }
  },
})

export const FindingSummaryTool = Tool.define("finding_summary", {
  description:
    "List this project's findings ranked for the final summary: accepted first, then by severity. False positives and duplicates are left out.",
  parameters: z.object({}),
  async execute() {
    const store = await Runtime.load(Runtime.file(Instance.directory))
    const list = Runtime.ranked(store)
    const output = list.length
      ? list.map((f, i) => `${i + 1}. [${f.severity}] ${f.title} (${f.cls}, ${f.status})`).join("\n")
      : "No findings recorded."
    return { title: "finding_summary", output, metadata: { count: list.length } }
  },
})
