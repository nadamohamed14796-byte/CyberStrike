import { spawn } from "node:child_process"
import z from "zod"
import { Tool } from "./tool"
import { EXTERNAL_TOOLS, externalTool } from "./external-tool-registry"
import { ScopeGuard } from "./scope-check"
import { Truncate } from "./truncation"
import { Instance } from "../project/instance"
import { TargetWorkspace } from "./target-workspace"

const MAX_OUTPUT = 200_000
const RISK_ORDER = { passive: 0, "active-read": 1, "active-test": 2, "high-impact": 3 } as const

type RunnerParameters = Record<string, unknown>

function replacementFor(name: string, input: { target: string; parameters: RunnerParameters }): string | undefined {
  const value = input.parameters[name]
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (name === "target" || name === "url") return input.target
  if (name === "input" || name === "js" || name === "path") return input.target
  return undefined
}

export function buildArgv(specCommand: string, input: { target: string; parameters?: RunnerParameters }): string[] {
  const parameters = input.parameters ?? {}
  const tokens = specCommand.match(/"[^"]*"|'[^']*'|\S+/g) ?? []
  const argv: string[] = []

  for (const token of tokens) {
    const unquoted = token.length >= 2 && ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'")))
      ? token.slice(1, -1)
      : token
    const expanded = unquoted.replace(/<([a-zA-Z_][a-zA-Z0-9_]*)>/g, (_, name: string) => {
      const value = replacementFor(name, { target: input.target, parameters })
      if (value === undefined) throw new Error(`Missing parameter <${name}> for external tool command`)
      return value
    })
    argv.push(expanded)
  }

  const extra = parameters.extra_args
  if (Array.isArray(extra)) {
    for (const value of extra) {
      if (typeof value !== "string") throw new Error("extra_args must contain only strings")
      argv.push(value)
    }
  }
  return argv
}

function riskRequiresScope(risk: keyof typeof RISK_ORDER) {
  return risk !== "passive"
}

function readStream(stream: NodeJS.ReadableStream, limit = MAX_OUTPUT) {
  return new Promise<string>((resolve) => {
    let output = ""
    stream.on("data", (chunk) => {
      if (output.length >= limit) return
      output += Buffer.from(chunk).toString("utf8")
      if (output.length > limit) output = output.slice(0, limit) + "\n[output truncated]"
    })
    stream.on("end", () => resolve(output))
    stream.on("error", () => resolve(output))
  })
}

export const ExternalToolRunnerTool = Tool.define("external_tool_runner", {
  description:
    "Execute one registered external security tool through the canonical registry. Commands are argv-based (never shell-evaluated), active tools require programmatic scope, and active-test/high-impact tools also require explicit authorization.",
  parameters: z.object({
    tool_id: z.string().describe(`Registered external tool ID. Available: ${EXTERNAL_TOOLS.map((x) => x.id).join(", ")}`),
    target: z.string().describe("In-scope target for the tool"),
    endpoint: z.string().optional().describe("Optional endpoint identity for run tracking"),
    scope_items: z.array(z.string()).describe("Programmatic in-scope hosts/URLs/CIDRs"),
    authorized_active_testing: z.boolean().default(false).describe("Explicit authorization for active testing"),
    parameters: z.record(z.string(), z.unknown()).optional(),
    timeout_ms: z.number().int().positive().max(15 * 60 * 1000).default(120_000),
  }),
  async execute(params, ctx) {
    const spec = externalTool(params.tool_id)
    if (!spec) throw new Error(`Unknown external tool: ${params.tool_id}`)

    const scope = ScopeGuard.check(params.target, params.scope_items)
    if (riskRequiresScope(spec.risk) && !scope.inScope) {
      throw new Error(`Out-of-scope external tool execution refused for ${params.target}`)
    }
    if (spec.risk !== "passive" && !params.authorized_active_testing) {
      throw new Error(`External tool ${spec.id} requires explicit active-testing authorization`)
    }

    const argv = buildArgv(spec.command, { target: params.target, parameters: params.parameters })
    if (!argv[0]) throw new Error(`External tool ${spec.id} has an empty command`)

    const workspace = await TargetWorkspace.ensure(params.target, ctx.sessionID)
    const proc = spawn(argv[0], argv.slice(1), {
      cwd: workspace.session,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    })

    let timedOut = false
    let aborted = false
    const kill = () => {
      try { proc.kill("SIGTERM") } catch {}
    }
    const abortHandler = () => {
      aborted = true
      kill()
    }
    ctx.abort.addEventListener("abort", abortHandler, { once: true })

    const timeout = setTimeout(() => {
      timedOut = true
      kill()
    }, params.timeout_ms)

    const [stdout, stderr, exitCode] = await Promise.all([
      readStream(proc.stdout),
      readStream(proc.stderr),
      new Promise<number>((resolve) => {
        proc.once("exit", (code, signal) => resolve(typeof code === "number" ? code : signal ? 128 : 0))
        proc.once("error", () => resolve(1))
      }),
    ])

    clearTimeout(timeout)
    ctx.abort.removeEventListener("abort", abortHandler)

    const status = aborted ? "cancelled" : timedOut ? "timed_out" : exitCode === 0 ? "completed" : "failed"
    const combined = [stdout, stderr].filter(Boolean).join("\n")
    const truncated = await Truncate.output(combined, {}, ctx.agent)

    return {
      title: `${spec.id}: ${status}`,
      output: truncated.content,
      metadata: {
        external_tool_id: spec.id,
        risk: spec.risk,
        phase: spec.phase,
        target_workspace: workspace.root,
        session_workspace: workspace.session,
        scope_verified: scope.inScope,
        authorization_verified: spec.risk === "passive" || params.authorized_active_testing,
        status,
        exit: exitCode,
        timed_out: timedOut,
        stdout,
        stderr,
        truncated: truncated.truncated,
        outputPath: truncated.truncated ? truncated.outputPath : undefined,
      },
    }
  },
})
