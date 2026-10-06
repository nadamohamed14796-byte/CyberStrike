import path from "node:path"
import { initMission,updateMission,canComplete } from "./mission"
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
const root=process.env.HUNT_ROOT??path.resolve(import.meta.dir,"..")
const [command,...args]=Bun.argv.slice(2)
async function main(){
  if(command==="init"){const target=args[0];if(!target)throw new Error("usage: hunt init <target>");console.log(JSON.stringify(await initMission(root,target,[{value:target}]),null,2));return}
  if(command==="scope"){const target=args[0];if(!target)throw new Error("usage: hunt scope <target>");console.log(JSON.stringify(checkScope(target,[{value:target}]),null,2));return}
  if(command==="status"){const target=args[0];if(!target)throw new Error("usage: hunt status <target>");console.log(JSON.stringify(await coverageGate(root,target),null,2));return}
  if(command==="resume"){const target=args[0];if(!target)throw new Error("usage: hunt resume <target>");const recovered=await recoverStaleAgentTasks(root,target);const context=await resumeHuntingContext(root,target);console.log(JSON.stringify({recovered,resumePhase:context.resumePhase,activeHypotheses:context.activeHypotheses.map(x=>x.id),activeTasks:context.activeTasks.map(x=>x.taskId),nextAttemptNumber:context.nextAttemptNumber},null,2));return}
  if(command==="plan-status"){const target=args[0];if(!target)throw new Error("usage: hunt plan-status <target>");const plan=await loadAgentPlan(root,target);const tasks=await loadTaskStates(root,target);console.log(JSON.stringify({plan,tasks},null,2));return}
  if(command==="writeup-ingest"){const source=args[0];if(!source)throw new Error("usage: hunt writeup-ingest <file> [title]");console.log(JSON.stringify(await ingestWriteupFile(root,source,args[1]),null,2));return}
  if(command==="autoplan"){const target=args[0];if(!target)throw new Error("usage: hunt autoplan <target>");console.log(JSON.stringify(await prepareMultiAgentPlanFromTargetIntelligence(root,target),null,2));return}
  if(command==="api-doc"){const target=args[0],file=args[1];if(!target||!file)throw new Error("usage: hunt api-doc <target> <openapi.json>");const content=await Bun.file(file).text();const apiSources=parseOpenApiJson(content);if(!apiSources.length)throw new Error("OPENAPI_PARSE_EMPTY");await rememberTargetIntelligence(root,target,{apiSources,tags:["api-documentation"]});console.log(JSON.stringify({target,apiSources},null,2));return}
  if(command==="dispatch"){const target=args[0];if(!target)throw new Error("usage: hunt dispatch <target> [limit]");const limit=Math.max(1,Number(args[1]??4));console.log(JSON.stringify(await resumePersistedDispatch(root,target,limit),null,2));return}
  if(command==="execute"){const target=args[0];if(!target)throw new Error("usage: hunt execute <target> [limit]");const limit=Math.max(1,Number(args[1]??4));const providerID=process.env.HUNT_MODEL_PROVIDER;const modelID=process.env.HUNT_MODEL_ID;const parentSessionID=process.env.HUNT_PARENT_SESSION_ID;console.log(JSON.stringify(await executePersistedDispatchWithNativeCyberStrike(root,target,{limit,parentSessionID,model:providerID&&modelID?{providerID,modelID}:undefined}),null,2));return}
  if(command==="task-complete"){const target=args[0];const taskId=args[1];const state=args[2] as "completed"|"failed"|"blocked";if(!target||!taskId||!["completed","failed","blocked"].includes(state))throw new Error("usage: hunt task-complete <target> <taskId> <completed|failed|blocked>");console.log(JSON.stringify(await completeDispatchedTask(root,target,taskId,state),null,2));return}
  if(command==="complete"){const target=args[0];if(!target)throw new Error("usage: hunt complete <target>");if(!(await canComplete(root,target)))throw new Error("COVERAGE_GATE_FAILED");console.log(JSON.stringify(await updateMission(root,target,"COMPLETED"),null,2));return}
  console.error("commands: init scope status resume autoplan plan-status writeup-ingest dispatch execute task-complete complete");process.exit(1)
}
await main()
