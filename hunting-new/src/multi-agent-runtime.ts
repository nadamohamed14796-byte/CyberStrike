import { buildMultiAgentPlan, type MultiAgentPlan } from "./multi-agent-planner"
import { persistAgentPlan } from "./agent-task-runtime"
import { loadSkillRegistry } from "./skill-registry-loader"
import type { SignalEngine, SkillRule } from "./signals"
import type { LearningEngine } from "./learning-engine"
import type { FalsePositiveIntelligence } from "./false-positive-intelligence"

export interface PreparedMultiAgentPlan {
  plan:MultiAgentPlan
  persistedTaskIds:string[]
  registrySize:number
}

export async function prepareMultiAgentPlan(
  root:string,
  engine:SignalEngine,
  rules:SkillRule[],
  target:string,
  learning?:LearningEngine,
  falsePositives?:FalsePositiveIntelligence,
):Promise<PreparedMultiAgentPlan>{
  const plan=buildMultiAgentPlan(engine,rules,target,learning,falsePositives)
  const created=await persistAgentPlan(root,plan)
  const registry=await loadSkillRegistry(root)

  for(const task of plan.tasks){
    const resolved=registry.selectForTask(task.skill,[task.signal,...task.strategyHints],task.signalConfidence)
    task.resolvedSkills=resolved.map(skill=>skill.name)
  }

  return {
    plan,
    persistedTaskIds:created.map(x=>x.taskId),
    registrySize:plan.tasks.reduce((sum,task)=>sum+(task.resolvedSkills?.length??0),0),
  }
}
