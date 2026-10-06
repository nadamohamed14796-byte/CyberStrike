import path from "node:path"
import { ensureDir, readJson, targetDir, writeJson, withTargetMutationLock } from "./store"
import type { MultiAgentPlan } from "./multi-agent-planner"

function file(root:string,target:string){
  return path.join(targetDir(root,target),"intelligence","agent-plan.json")
}

export async function loadAgentPlan(root:string,target:string):Promise<MultiAgentPlan|null>{
  return readJson<MultiAgentPlan|null>(file(root,target),null)
}

export async function saveAgentPlan(root:string,plan:MultiAgentPlan):Promise<MultiAgentPlan>{
  return withTargetMutationLock(root,plan.target,async()=>{
    const destination=file(root,plan.target)
    await ensureDir(path.dirname(destination))
    await writeJson(destination,plan)
    return plan
  })
}
