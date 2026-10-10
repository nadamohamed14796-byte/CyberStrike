import path from "node:path"
import { readJson,writeJson,ensureDir,targetDir,withTargetMutationLock } from "./store"
import { checkScope,type ScopeRule } from "./scope"
import { coverageGate } from "./ledger"
import { loadTaskStates } from "./task-state-store"
import { loadHypotheses } from "./hypothesis-store"
import { loadHuntingState } from "./hunting-state"
export type MissionState="CREATED"|"SCOPING"|"MAPPING"|"DISCOVERY"|"TRIAGE"|"VALIDATION"|"VERIFICATION"|"REPORTING"|"COMPLETED"|"PAUSED"
export type Mission={mission_id:string;target:string;state:MissionState;created_at:string;updated_at:string;scope:ScopeRule[];checkpoint?:string}
export async function initMission(root:string,target:string,scope:ScopeRule[]){
  const decision=checkScope(target,scope)
  if(!decision.allowed)throw new Error("MISSION_BLOCKED: "+decision.reason)
  return withTargetMutationLock(root,target,async()=>{
    const dir=targetDir(root,target);await ensureDir(path.join(dir,"intelligence"))
    const file=path.join(dir,"mission.json");const existing=await readJson<Mission|null>(file,null);if(existing){assertMissionTarget(existing,target);return existing}
    const now=new Date().toISOString();const mission={mission_id:"mission_"+Bun.hash(target+now).toString(16),target,state:"CREATED" as const,created_at:now,updated_at:now,scope}
    await writeJson(file,mission);await writeJson(path.join(dir,"scope.json"),scope);return mission
  })
}
function canonicalTarget(value:string){
  const input=value.trim()
  try{
    const url=new URL(input.includes("://")?input:"https://"+input)
    return url.protocol.toLowerCase()+"//"+url.host.toLowerCase()+url.pathname.replace(/\/+$/,"")
  }catch{
    return input.toLowerCase().replace(/\/+$/,"")
  }
}
function assertMissionTarget(mission:Mission,target:string){
  if(canonicalTarget(mission.target)!==canonicalTarget(target)){
    throw new Error("TARGET_STORAGE_COLLISION: requested target shares a storage slug with "+mission.target)
  }
}
export async function loadMission(root:string,target:string){
  const mission=await readJson<Mission|null>(path.join(targetDir(root,target),"mission.json"),null)
  if(mission)assertMissionTarget(mission,target)
  return mission
}
export async function updateMission(root:string,target:string,state:MissionState,checkpoint?:string){
  return withTargetMutationLock(root,target,async()=>{
    const file=path.join(targetDir(root,target),"mission.json");const mission=await readJson<Mission|null>(file,null);if(!mission)throw new Error("MISSION_NOT_FOUND");assertMissionTarget(mission,target)
    if(mission.state==="COMPLETED" && state!=="COMPLETED")throw new Error("MISSION_STATE_INVALID: completed mission cannot resume")
    const next={...mission,state,checkpoint:checkpoint??mission.checkpoint,updated_at:new Date().toISOString()}
    await writeJson(file,next);return next
  })
}
export async function canComplete(root:string,target:string){
  const [coverage,tasks,hypotheses,state]=await Promise.all([
    coverageGate(root,target),
    loadTaskStates(root,target),
    loadHypotheses(root,target),
    loadHuntingState(root,target),
  ])
  const activeTasks=tasks.tasks.filter(x=>x.state==="pending"||x.state==="claimed"||x.state==="running")
  const activeHypotheses=hypotheses.hypotheses.filter(x=>x.status==="pending"||x.status==="testing")
  const plannedAttempts=state.attempts.attempts.filter(x=>x.state==="planned")
  return {
    complete:coverage.complete && activeTasks.length===0 && activeHypotheses.length===0 && plannedAttempts.length===0,
    coverage,
    activeTasks:activeTasks.map(x=>x.taskId),
    activeHypotheses:activeHypotheses.map(x=>x.id),
    plannedAttempts:plannedAttempts.map(x=>x.id),
  }
}
export async function scopeGate(target:string,rules:ScopeRule[]){const decision=checkScope(target,rules);if(!decision.allowed)throw new Error("MISSION_BLOCKED: "+decision.reason);return decision}
