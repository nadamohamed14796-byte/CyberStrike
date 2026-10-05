import { runHuntingTask } from "../../packages/cyberstrike/src/tool/task"
import type { AgentTaskExecutionContext, AgentTaskExecutor } from "./multi-agent-runtime"
import { buildSkillExecutionInvocation } from "./skill-execution-adapter"

export interface NativeCyberStrikeExecutorOptions {
  agentBySkill?:Record<string,string>
  defaultAgent?:string
  parentSessionID?:string
}

export class NativeCyberStrikeExecutor implements AgentTaskExecutor {
  constructor(private readonly options:NativeCyberStrikeExecutorOptions={}){}

  async execute(context:AgentTaskExecutionContext){
    const invocation=buildSkillExecutionInvocation(context,{
      agentBySkill:this.options.agentBySkill,
      defaultAgent:this.options.defaultAgent,
    })
    const result=await runHuntingTask({
      description:`validate ${context.signal}`,
      prompt:invocation.prompt,
      subagentType:invocation.agent,
      parentSessionID:this.options.parentSessionID,
    })
    const state:"executed"|"inconclusive"|"blocked"|"rejected"|"confirmed" =
      result.outcome==="clean" ? "executed" : "inconclusive"
    return {
      state,
      attemptId:context.attemptId,
      requestId:context.requestId,
      resultSummary:result.output.slice(0,2000),
      resultText:[
        "<execution_result>",
        `outcome: ${result.outcome}`,
        `task_id: ${result.taskId}`,
        "</execution_result>",
        "",
        result.output,
      ].join("\n"),
    }
  }
}
