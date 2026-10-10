import path from "node:path"
import { runHuntingTask } from "../../packages/cyberstrike/src/tool/task"
import { Instance } from "../../packages/cyberstrike/src/project/instance"
import type { AgentTaskExecutionContext, AgentTaskExecutor } from "./multi-agent-runtime"
import { loadMission } from "./mission"
import { checkScope } from "./scope"
import { loadTargetIntelligence } from "./target-intelligence"
import { buildSkillExecutionInvocation } from "./skill-execution-adapter"
import { parseExecutionResult } from "./execution-result"
import { markReferencesUsed } from "./reference-store"

export interface NativeCyberStrikeExecutorOptions {
  agentBySkill?:Record<string,string>
  agentByRole?:Record<string,string>
  defaultAgent?:string
  parentSessionID?:string
  model?:{providerID:string;modelID:string}
  worktree?:string
  root?:string
}

export class NativeCyberStrikeExecutor implements AgentTaskExecutor {
  constructor(private readonly options:NativeCyberStrikeExecutorOptions={}){}

  async execute(context:AgentTaskExecutionContext){
    const root=this.options.root ?? process.env.HUNT_ROOT ?? path.resolve(process.cwd(),"hunting-new")
    const checkActiveScope=async()=>{
      const mission=await loadMission(root,context.target)
      if(!mission)return {allowed:false,normalized:"",reason:"mission-not-initialized"}
      const intelligence=await loadTargetIntelligence(root,context.target)
      const request=context.requestId
        ? intelligence.requests.find(item=>item.id===context.requestId)
        : undefined
      const candidates=[
        context.target,
        request?.url,
        context.endpoint && /^https?:\/\//i.test(context.endpoint) ? context.endpoint : undefined,
      ].filter((value):value is string=>Boolean(value))
      for(const candidate of candidates){
        const decision=checkScope(candidate,mission.scope)
        if(!decision.allowed)return {...decision,reason:candidate+": "+decision.reason}
      }
      return checkScope(context.target,mission.scope)
    }
    const blocked=(reason:string)=>({
      state:"blocked" as const,
      attemptId:context.attemptId,
      requestId:context.requestId,
      resultSummary:"Active scope re-check blocked execution: "+reason,
      resultText:"scope_blocked",
    })
    const initialScope=await checkActiveScope()
    if(!initialScope.allowed)return blocked(initialScope.reason)
    if(context.referenceIds?.length) await markReferencesUsed(root,context.referenceIds)
    const invocation=buildSkillExecutionInvocation(context,{
      agentBySkill:this.options.agentBySkill,
      agentByRole:this.options.agentByRole,
      defaultAgent:this.options.defaultAgent,
    })
    const finalScope=await checkActiveScope()
    if(!finalScope.allowed)return blocked(finalScope.reason)
    const result=await Instance.provide({ directory: this.options.worktree ?? process.cwd(), fn: async () => runHuntingTask({
      description:`validate ${context.signal}`,
      prompt:invocation.prompt,
      subagentType:invocation.agent,
      parentSessionID:this.options.parentSessionID,
      model:this.options.model,
    }) })
    const fallbackState:"executed"|"inconclusive" = result.outcome==="clean" ? "executed" : "inconclusive"
    const wrappedOutput=[
      "<execution_result>",
      `outcome: ${result.outcome}`,
      `task_id: ${result.taskId}`,
      "</execution_result>",
      "",
      result.output,
    ].join("\n")
    const parsed=parseExecutionResult(wrappedOutput,{state:fallbackState,outcome:result.outcome})
    const state = result.outcome==="clean" ? parsed.state : "inconclusive"
    return {
      state,
      attemptId:context.attemptId,
      requestId:parsed.requestId ?? context.requestId,
      responseId:parsed.responseId ?? context.responseId,
      resultSummary:parsed.resultSummary.slice(0,2000),
      resultText:wrappedOutput,
    }
  }
}
