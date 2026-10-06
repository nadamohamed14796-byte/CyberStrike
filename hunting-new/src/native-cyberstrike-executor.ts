import { runHuntingTask } from "../../packages/cyberstrike/src/tool/task"
import { Instance } from "../../packages/cyberstrike/src/project/instance"
import type { AgentTaskExecutionContext, AgentTaskExecutor } from "./multi-agent-runtime"
import { buildSkillExecutionInvocation } from "./skill-execution-adapter"
import { parseExecutionResult, verifiedEvidenceIds } from "./execution-result"
import { loadEvidence } from "./evidence-store"

export interface NativeCyberStrikeExecutorOptions {
  agentBySkill?:Record<string,string>
  agentByRole?:Record<string,string>
  defaultAgent?:string
  parentSessionID?:string
  model?:{providerID:string;modelID:string}
  worktree?:string
}

export class NativeCyberStrikeExecutor implements AgentTaskExecutor {
  constructor(private readonly options:NativeCyberStrikeExecutorOptions={}){}

  async execute(context:AgentTaskExecutionContext){
    const invocation=buildSkillExecutionInvocation(context,{
      agentBySkill:this.options.agentBySkill,
      agentByRole:this.options.agentByRole,
      defaultAgent:this.options.defaultAgent,
    })
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
    const available=(await loadEvidence(this.options.worktree ?? process.cwd(),context.target)).evidence
    const evidenceIds=verifiedEvidenceIds(parsed,new Set(available.map(item=>item.id)))
    const state = result.outcome==="clean" ? parsed.state : "inconclusive"
    return {
      state,
      attemptId:context.attemptId,
      requestId:parsed.requestId ?? context.requestId,
      responseId:parsed.responseId ?? context.responseId,
      resultSummary:parsed.resultSummary.slice(0,2000),
      resultText:wrappedOutput,
      evidenceIds,
    }
  }
}
