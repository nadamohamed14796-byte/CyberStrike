import path from "node:path"
import { readJson,writeJson,targetDir } from "./store"
export type LearningSignal={signal:string;strategy?:string;technology?:string;target?:string;weight:number;confidence:number;source:string;timestamp:string}
function bounded(value:number){return Math.max(-1,Math.min(1,value))}
export async function recordLearning(root:string,target:string,input:Omit<LearningSignal,"timestamp">){const file=path.join(targetDir(root,target),"learning","signals.json");const current=await readJson<LearningSignal[]>(file,[]);const item={...input,weight:bounded(input.weight),confidence:Math.max(0,Math.min(1,input.confidence)),timestamp:new Date().toISOString()};await writeJson(file,[...current,item]);return item}
export async function readLearning(root:string,target:string){return readJson<LearningSignal[]>(path.join(targetDir(root,target),"learning","signals.json"),[])}
