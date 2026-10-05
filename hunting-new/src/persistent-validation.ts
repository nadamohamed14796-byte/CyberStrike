import path from "node:path"
import { readJson,writeJson,targetDir } from "./store"
import type { Attempt } from "./validation"
export async function loadAttempts(root:string,target:string){return readJson<Attempt[]>(path.join(targetDir(root,target),"validation","attempts.json"),[])}
export async function saveAttempt(root:string,target:string,attempt:Attempt){const file=path.join(targetDir(root,target),"validation","attempts.json");const items=await loadAttempts(root,target);const next=items.some(x=>x.attempt_id===attempt.attempt_id)?items.map(x=>x.attempt_id===attempt.attempt_id?attempt:x):[...items,attempt];await writeJson(file,next);return attempt}
