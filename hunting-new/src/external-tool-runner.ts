import { spawn } from "node:child_process"
import { checkScope, type ScopeRule } from "./scope"
import { rememberTargetIntelligence, type ParameterCandidate } from "./target-intelligence"
import { loadMission } from "./mission"
export type DiscoveryTool = "arjun" | "x8"

export interface ToolRunRequest {
  tool: DiscoveryTool
  target: string
  scope: ScopeRule[]
  timeoutMs?: number
  maxOutputBytes?: number
  root?: string
  requestId?: string
}

export interface ToolRunResult {
  tool: DiscoveryTool
  target: string
  allowed: boolean
  exitCode: number | null
  timedOut: boolean
  output: string
  parameters: ParameterCandidate[]
}

const COMMANDS: Record<DiscoveryTool, string> = {
  arjun: "arjun",
  x8: "x8",
}

function parseParameterNames(tool: DiscoveryTool, output: string): string[] {
  const names = new Set<string>()
  const add = (value: string) => {
    const name = value.trim().replace(/^[-_]+|[-_]+$/g, "")
    if (/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(name)) names.add(name)
  }
  for (const line of output.split(/\r?\n/)) {
    if (tool === "arjun") {
      for (const match of line.matchAll(/(?:^|[,\s])([A-Za-z_][A-Za-z0-9_.-]{0,127})(?=[,\s:=]|$)/g)) add(match[1])
    } else {
      for (const match of line.matchAll(/(?:param(?:eter)?\s*[:=]\s*|^\s*)([A-Za-z_][A-Za-z0-9_.-]{0,127})/i)) add(match[1])
    }
  }
  return [...names]
}

export async function runDiscoveryTool(input: ToolRunRequest): Promise<ToolRunResult> {
  const decision = checkScope(input.target, input.scope)
  if (!decision.allowed) {
    return { tool: input.tool, target: input.target, allowed: false, exitCode: null, timedOut: false, output: "", parameters: [] }
  }

  const timeoutMs = Math.min(Math.max(input.timeoutMs ?? 60_000, 1_000), 300_000)
  const maxOutputBytes = Math.min(Math.max(input.maxOutputBytes ?? 256_000, 4_096), 2_000_000)
  const args = input.tool === "arjun"
    ? ["-u", input.target, "--quiet"]
    : ["-u", input.target]

  return new Promise(resolve => {
    const child = spawn(COMMANDS[input.tool], args, { stdio: ["ignore", "pipe", "pipe"] })
    let output = ""
    let timedOut = false
    const append = (chunk: Buffer) => {
      if (output.length >= maxOutputBytes) return
      output += chunk.toString("utf8").slice(0, maxOutputBytes - output.length)
    }
    child.stdout.on("data", append)
    child.stderr.on("data", append)
    const timer = setTimeout(() => {
      timedOut = true
      child.kill("SIGTERM")
    }, timeoutMs)
    child.on("error", () => {
      clearTimeout(timer)
      resolve({ tool: input.tool, target: input.target, allowed: true, exitCode: null, timedOut, output, parameters: [] })
    })
    child.on("close", code => {
      clearTimeout(timer)
      const parameters = parseParameterNames(input.tool, output).map(name => ({
        id: "param_" + Bun.hash(decision.normalized + "|query|" + name).toString(16),
        name,
        location: "query" as const,
        endpoint: input.target,
        requestIds: input.requestId ? [input.requestId] : [],
        sources: ["tool" as const],
        confidence: 0.70,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      }))
      resolve({ tool: input.tool, target: input.target, allowed: true, exitCode: code, timedOut, output, parameters })
    })
  })
}

export async function runScopedParameterDiscovery(
  root: string,
  target: string,
  requestId?: string,
  tool: DiscoveryTool = "arjun",
): Promise<ToolRunResult> {
  const mission = await loadMission(root, target)
  if (!mission) throw new Error("MISSION_NOT_FOUND")
  const result = await runDiscoveryTool({ tool, target, scope: mission.scope, root, requestId })
  if (!result.allowed || !result.parameters.length) return result
  await rememberTargetIntelligence(root, target, { parameters: result.parameters, tags: [`parameter-tool:${tool}`] })
  return result
}