import path from "node:path"
import { readJson,writeJson,ensureDir,targetDir } from "./store"
import { checkScope,type ScopeRule } from "./scope"
import { coverageGate } from "./ledger"
export type MissionState="CREATED"|"SCOPING"|"MAPPING"|"DISCOVERY"|"TRIAGE"|"VALIDATION"|"VERIFICATION"|"REPORTING"|"COMPLETED"|"PAUSED"
export type Mission={mission_id:string;target:string;state:MissionState;created_at:string;updated_at:string;scope:ScopeRule[];checkpoint?:string}
export async function initMission(root:string,target:string,scope:ScopeRule[]){const dir=targetDir(root,target);await ensureDir(path.join(dir,"intelligence"));const file=path.join(dir,"mission.json");const existing=await readJson<Mission|null>(file,null);if(existing)return existing;const now=new Date().toISOString();const mission={mission_id:"mission_"+Bun.hash(target+now).toString(16),target,state:"CREATED" as const,created_at:now,updated_at:now,scope};await writeJson(file,mission);await writeJson(path.join(dir,"scope.json"),scope);return mission}
export async function updateMission(root:string,target:string,state:MissionState,checkpoint?:string){const file=path.join(targetDir(root,target),"mission.json");const mission=await readJson<Mission|null>(file,null);if(!mission)throw new Error("MISSION_NOT_FOUND");const next={...mission,state,checkpoint:checkpoint??mission.checkpoint,updated_at:new Date().toISOString()};await writeJson(file,next);return next}
export async function canComplete(root:string,target:string){return(await coverageGate(root,target)).complete}
export async function scopeGate(target:string,rules:ScopeRule[]){const decision=checkScope(target,rules);if(!decision.allowed)throw new Error("MISSION_BLOCKED: "+decision.reason);return decision}
