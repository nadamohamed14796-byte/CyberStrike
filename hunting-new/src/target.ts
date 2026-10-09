import path from "node:path"
import { readJson,writeJson,ensureDir,targetDir } from "./store"
export type TargetMemory={target:string;assets:unknown[];endpoints:unknown[];parameters:unknown[];technologies:unknown[];accounts:unknown[];js:unknown[];requests:unknown[];responses:unknown[];findings:unknown[];notes:string[];next_actions:string[]}
export async function loadTarget(root:string,target:string){const file=path.join(targetDir(root,target),"target.json");return readJson<TargetMemory>(file,{target,assets:[],endpoints:[],parameters:[],technologies:[],accounts:[],js:[],requests:[],responses:[],findings:[],notes:[],next_actions:[]})}
export async function saveTarget(root:string,memory:TargetMemory){const dir=targetDir(root,memory.target);await ensureDir(dir);await writeJson(path.join(dir,"target.json"),memory);return memory}
export async function mergeTarget(root:string,target:string,patch:Partial<TargetMemory>){const current=await loadTarget(root,target);return saveTarget(root,{...current,...patch,target})}
