import path from "node:path"
import { readJson,writeJson,targetDir } from "./store"
export type FPRecord={fingerprint:string;target:string;endpoint?:string;class_name:string;reason:string;evidence:string[];date:string;confidence:number}
export async function recordFP(root:string,item:FPRecord){const file=path.join(targetDir(root,item.target),"findings","fp.json");const current=await readJson<FPRecord[]>(file,[]);await writeJson(file,[...current.filter(x=>x.fingerprint!==item.fingerprint),item]);return item}
export async function hasFP(root:string,target:string,fingerprint:string){const items=await readJson<FPRecord[]>(path.join(targetDir(root,target),"findings","fp.json"),[]);return items.some(x=>x.fingerprint===fingerprint)}
