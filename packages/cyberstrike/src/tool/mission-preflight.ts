import z from "zod"
import { Tool } from "./tool"
import { ScopeGuard } from "./scope-check"
import { TargetWorkspace } from "./target-workspace"
import { Agent } from "../agent/agent"
import { Provider } from "../provider/provider"

export const MissionPreflightTool = Tool.define("mission_preflight", {
  description:"Validate mission prerequisites before a hunt/recon workflow. Scope is always checked programmatically; client-supplied verification flags are ignored.",
  parameters:z.object({ target:z.string(), scope_items:z.array(z.string()).min(1), required_tools:z.array(z.string()).default([]), require_active_authorization:z.boolean().default(false) }),
  async execute(params,ctx){
    const scope=ScopeGuard.check(params.target,params.scope_items)
    if(!scope.inScope) throw new Error(`Preflight failed: target is out of scope: ${params.target}`)
    const workspace=await TargetWorkspace.ensure(params.target,ctx.sessionID)
    const { ToolRegistry } = await import("./registry")
    const ids=new Set(await ToolRegistry.ids())
    const missingTools=params.required_tools.filter((id)=>!ids.has(id))
    const agents=await Agent.list()
    const defaultModel=await Provider.defaultModel()
    if(missingTools.length) throw new Error(`Preflight failed: missing runtime tools: ${missingTools.join(", ")}`)
    return {
      title:"Mission preflight passed",
      output:JSON.stringify({target:params.target,scope_verified:true,authorization_required:params.require_active_authorization,workspace:workspace.root,session_workspace:workspace.session,tool_count:ids.size,agent_count:agents.length,model:{providerID:defaultModel.providerID,modelID:defaultModel.modelID}},null,2),
      metadata:{scope_verified:true,authorization_required:params.require_active_authorization,missing_tools:missingTools,workspace:workspace.root,session_workspace:workspace.session},
    }
  },
})