import { spawn } from "node:child_process"
import { checkScope, type ScopeRule } from "./scope"
import { rememberTargetIntelligence, type ParameterCandidate } from "./target-intelligence"
import { loadMission } from "./mission"
import path from "node:path"
import { readJson, targetDir, writeJson, withTargetMutationLock } from "./store"
export type DiscoveryTool = "arjun" | "x8"

export interface ToolRunRequest {
  tool: DiscoveryTool
  target: string
  scope: ScopeRule[]
  timeoutMs?: number
  maxOutputBytes?: number
  root?: string
  missionTarget?: string
  requestId?: string
}

export interface ToolRunRecord {
  id:string
  tool:DiscoveryTool
  target:string
  endpoint:string
  requestId?:string
  status:"completed"|"timed_out"|"failed"|"blocked"|"skipped"
  exitCode:number|null
  parameterNames:string[]
  startedAt:string
  finishedAt:string
}

interface ToolRunState { target:string; runs:ToolRunRecord[]; updatedAt:string }

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

async function loadToolRuns(root:string,target:string):Promise<ToolRunState>{
  return (await readJson<ToolRunState|null>(
    path.join(targetDir(root,target),"intelligence","tool-runs.json"),null,
  )) ?? {target,runs:[],updatedAt:new Date(0).toISOString()}
}

async function saveToolRuns(root:string,state:ToolRunState){
  await writeJson(path.join(targetDir(root,state.target),"intelligence","tool-runs.json"),{
    ...state,updatedAt:new Date().toISOString(),
  })
}

function toolRunKey(tool:DiscoveryTool,target:string,endpoint:string,requestId?:string){
  return Bun.hash(tool+"|"+target+"|"+endpoint+"|"+(requestId??"")).toString(16)
}

export async function listToolRuns(root:string,target:string):Promise<ToolRunRecord[]>{
  return (await loadToolRuns(root,target)).runs
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

async function runDiscoveryTool(input: ToolRunRequest): Promise<ToolRunResult> {
  // When invoked through the supported wrapper, reload the authoritative mission
  // immediately before spawn rather than trusting a stale caller-supplied scope.
  let activeScope=input.scope
  if(input.root && input.missionTarget){
    const mission=await loadMission(input.root,input.missionTarget)
    if(!mission)throw new Error("MISSION_NOT_FOUND")
    activeScope=mission.scope
  }
  const decision = checkScope(input.target, activeScope)
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
  endpoint: string,
  requestId?: string,
  tool: DiscoveryTool = "arjun",
): Promise<ToolRunResult> {
  const mission = await loadMission(root, target)
  if (!mission) throw new Error("MISSION_NOT_FOUND")

  const key=toolRunKey(tool,target,endpoint,requestId)
  const existingState=await loadToolRuns(root,target)
  const existing=existingState.runs.find(x=>x.id===key && x.status==="completed")
  if(existing){
    return {
      tool,target,allowed:true,exitCode:existing.exitCode,timedOut:false,output:"",
      parameters:existing.parameterNames.map(name=>({
        id:"param_"+Bun.hash(endpoint+"|query|"+name).toString(16),
        name,location:"query" as const,endpoint,
        requestIds:requestId?[requestId]:[],sources:["tool" as const],
        confidence:0.70,firstSeen:Date.now(),lastSeen:Date.now(),
      })),
    }
  }

  const startedAt=new Date().toISOString()
  const result = await runDiscoveryTool({ tool, target: endpoint, scope: mission.scope, root, missionTarget: target, requestId })
  const status:ToolRunRecord["status"]=!result.allowed ? "blocked" : result.timedOut ? "timed_out" : result.exitCode===0 ? "completed" : "failed"
  await withTargetMutationLock(root,target,async()=>{
    const state=await loadToolRuns(root,target)
    state.runs=state.runs.filter(x=>x.id!==key)
    state.runs.push({
      id:key,tool,target,endpoint,requestId,status,exitCode:result.exitCode,
      parameterNames:result.parameters.map(x=>x.name),
      startedAt,finishedAt:new Date().toISOString(),
    })
    await saveToolRuns(root,state)
  })

  if (!result.allowed || !result.parameters.length) return result
  await rememberTargetIntelligence(root, target, { parameters: result.parameters, tags: [`parameter-tool:${tool}`] })
  return result
}