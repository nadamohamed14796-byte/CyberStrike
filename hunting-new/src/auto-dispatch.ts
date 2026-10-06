import { loadMission } from "./mission"
import { prepareMultiAgentPlanFromTargetIntelligence } from "./multi-agent-runtime"
import { executePersistedDispatchWithNativeCyberStrike } from "./native-dispatch"

const queues = new Map<string, Promise<unknown>>()

export interface AutoDispatchOptions {
  parentSessionID?: string
  limit?: number
  agentBySkill?: Record<string,string>
  agentByRole?: Record<string,string>
  defaultAgent?: string
  model?: { providerID:string; modelID:string }
}

async function run(root:string,target:string,options:AutoDispatchOptions){
  const mission=await loadMission(root,target)
  if(!mission) return {enabled:true,started:false,reason:"mission not initialized"}
  const prepared=await prepareMultiAgentPlanFromTargetIntelligence(root,target)
  if(!prepared.plan.tasks.length) return {enabled:true,started:false,reason:"no routed tasks"}
  return executePersistedDispatchWithNativeCyberStrike(root,target,{
    limit:options.limit,
    agentBySkill:options.agentBySkill,
    agentByRole:options.agentByRole,
    defaultAgent:options.defaultAgent,
    parentSessionID:options.parentSessionID,
    model:options.model,
  })
}

export async function autoDispatchForTarget(
  root:string,
  target:string,
  options:AutoDispatchOptions={},
){
  if(process.env.HUNTING_AUTO_EXECUTE!=="true"){
    return {enabled:false,started:false,reason:"HUNTING_AUTO_EXECUTE is not enabled"}
  }
  const previous=queues.get(target) ?? Promise.resolve()
  const current=previous.then(()=>run(root,target,options))
  queues.set(target,current)
  try{
    return await current
  } finally {
    if(queues.get(target)===current) queues.delete(target)
  }
}
