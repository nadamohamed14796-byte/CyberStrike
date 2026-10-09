import path from "node:path"
import { initMission,updateMission,canComplete,loadMission } from "./mission"
import { checkScope } from "./scope"
import { coverageGate } from "./ledger"
import { loadAgentPlan } from "./agent-plan-store"
import { loadTaskStates } from "./task-state-store"
import { resumePersistedDispatch, completeDispatchedTask, prepareMultiAgentPlanFromTargetIntelligence } from "./multi-agent-runtime"
import { resumeHuntingContext } from "./runtime-persistence"
import { recoverStaleAgentTasks } from "./agent-task-runtime"
import { executePersistedDispatchWithNativeCyberStrike } from "./native-dispatch"
import { parseOpenApiJson } from "./api-document"
import { rememberTargetIntelligence } from "./target-intelligence"
import { ingestWriteupFile } from "./writeup-store"
import { loadPolicies } from "./policy"
import { loadConfiguredScope } from "./scope-config"

const root=process.env.HUNT_ROOT??path.resolve(import.meta.dir,"..")
const [command,...args]=Bun.argv.slice(2)

async function authorizedMissionTarget(target:string) {
  const mission=await loadMission(root,target)
  if(!mission) throw new Error("MISSION_NOT_FOUND: initialize the target with an explicit configured scope first")
  const decision=checkScope(target,mission.scope)
  if(!decision.allowed) throw new Error("MISSION_BLOCKED: "+decision.reason)
  return mission
}

async function main(){
  const policies=await loadPolicies(root)
  if(command==="init"){
    const target=args[0]
    if(!target) throw new Error("usage: hunt init <target>")
    const configuredScope=await loadConfiguredScope(root)
    if(policies.safety.require_scope_gate && configuredScope.length===0) {
      throw new Error("SCOPE_CONFIG_EMPTY: add explicitly authorized rules to config/scope.yaml before initializing a mission")
    }
    const decision=checkScope(target,configuredScope)
    if(!decision.allowed) throw new Error("MISSION_BLOCKED: target is not authorized by config/scope.yaml ("+decision.reason+")")
    console.log(JSON.stringify(await initMission(root,target,configuredScope),null,2))
    return
  }
  if(command==="scope"){
    const target=args[0]
    if(!target) throw new Error("usage: hunt scope <target>")
    const rules=await loadConfiguredScope(root)
    if(policies.safety.require_scope_gate && rules.length===0) throw new Error("SCOPE_CONFIG_EMPTY: add explicitly authorized rules to config/scope.yaml")
    const decision=checkScope(target,rules)
    console.log(JSON.stringify(decision,null,2))
    if(!decision.allowed) process.exitCode=2
    return
  }
  if(command==="status"){const target=args[0];if(!target)throw new Error("usage: hunt status <target>");console.log(JSON.stringify(await coverageGate(root,target),null,2));return}
  if(command==="resume"){const target=args[0];if(!target)throw new Error("usage: hunt resume <target>");await authorizedMissionTarget(target);const recovered=await recoverStaleAgentTasks(root,target);const context=await resumeHuntingContext(root,target);console.log(JSON.stringify({recovered,resumePhase:context.resumePhase,activeHypotheses:context.activeHypotheses.map(x=>x.id),activeTasks:context.activeTasks.map(x=>x.taskId),nextAttemptNumber:context.nextAttemptNumber},null,2));return}
  if(command==="plan-status"){const target=args[0];if(!target)throw new Error("usage: hunt plan-status <target>");const plan=await loadAgentPlan(root,target);const tasks=await loadTaskStates(root,target);console.log(JSON.stringify({plan,tasks},null,2));return}
  if(command==="writeup-ingest"){const source=args[0];if(!source)throw new Error("usage: hunt writeup-ingest <file> [title]");console.log(JSON.stringify(await ingestWriteupFile(root,source,args[1]),null,2));return}
  if(command==="autoplan"){const target=args[0];if(!target)throw new Error("usage: hunt autoplan <target>");await authorizedMissionTarget(target);console.log(JSON.stringify(await prepareMultiAgentPlanFromTargetIntelligence(root,target),null,2));return}
  if(command==="api-doc"){const target=args[0],file=args[1];if(!target||!file)throw new Error("usage: hunt api-doc <target> <openapi.json>");await authorizedMissionTarget(target);const content=await Bun.file(file).text();const apiSources=parseOpenApiJson(content);if(!apiSources.length)throw new Error("OPENAPI_PARSE_EMPTY");await rememberTargetIntelligence(root,target,{apiSources,tags:["api-documentation"]});console.log(JSON.stringify({target,apiSources},null,2));return}
  if(command==="dispatch"){const target=args[0];if(!target)throw new Error("usage: hunt dispatch <target> [limit]");await authorizedMissionTarget(target);const limit=Math.max(1,Number(args[1]??4));console.log(JSON.stringify(await resumePersistedDispatch(root,target,limit),null,2));return}
  if(command==="execute"){const target=args[0];if(!target)throw new Error("usage: hunt execute <target> [limit]");await authorizedMissionTarget(target);const limit=Math.max(1,Number(args[1]??4));const providerID=process.env.HUNT_MODEL_PROVIDER;const modelID=process.env.HUNT_MODEL_ID;const parentSessionID=process.env.HUNT_PARENT_SESSION_ID;console.log(JSON.stringify(await executePersistedDispatchWithNativeCyberStrike(root,target,{limit,parentSessionID,model:providerID&&modelID?{providerID,modelID}:undefined}),null,2));return}
  if(command==="task-complete"){const target=args[0];const taskId=args[1];const state=args[2] as "completed"|"failed"|"blocked";if(!target||!taskId||![ "completed","failed","blocked"].includes(state))throw new Error("usage: hunt task-complete <target> <taskId> <completed|failed|blocked>");await authorizedMissionTarget(target);console.log(JSON.stringify(await completeDispatchedTask(root,target,taskId,state),null,2));return}
  if(command==="complete"){const target=args[0];if(!target)throw new Error("usage: hunt complete <target>");await authorizedMissionTarget(target);const completion=await canComplete(root,target);if(!completion.complete)throw new Error("COVERAGE_GATE_FAILED: "+JSON.stringify({coverage:completion.coverage,activeTasks:completion.activeTasks,activeHypotheses:completion.activeHypotheses,plannedAttempts:completion.plannedAttempts}));console.log(JSON.stringify(await updateMission(root,target,"COMPLETED"),null,2));return}
  console.error("commands: init scope status resume autoplan plan-status writeup-ingest dispatch execute task-complete complete")
  process.exit(1)
}
await main()
