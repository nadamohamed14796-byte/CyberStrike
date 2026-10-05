import path from "node:path"
import { initMission,updateMission,canComplete } from "./mission"
import { checkScope } from "./scope"
import { coverageGate } from "./ledger"
import { loadAgentPlan } from "./agent-plan-store"
import { loadTaskStates } from "./task-state-store"
import { resumePersistedDispatch, completeDispatchedTask } from "./multi-agent-runtime"
const root=process.env.HUNT_ROOT??path.resolve(import.meta.dir,"..")
const [command,...args]=Bun.argv.slice(2)
async function main(){
  if(command==="init"){const target=args[0];if(!target)throw new Error("usage: hunt init <target>");console.log(JSON.stringify(await initMission(root,target,[{value:target}]),null,2));return}
  if(command==="scope"){const target=args[0];if(!target)throw new Error("usage: hunt scope <target>");console.log(JSON.stringify(checkScope(target,[{value:target}]),null,2));return}
  if(command==="status"){const target=args[0];if(!target)throw new Error("usage: hunt status <target>");console.log(JSON.stringify(await coverageGate(root,target),null,2));return}
  if(command==="resume"){const target=args[0];if(!target)throw new Error("usage: hunt resume <target>");console.log(JSON.stringify(await initMission(root,target,[]),null,2));return}
  if(command==="plan-status"){const target=args[0];if(!target)throw new Error("usage: hunt plan-status <target>");const plan=await loadAgentPlan(root,target);const tasks=await loadTaskStates(root,target);console.log(JSON.stringify({plan,tasks},null,2));return}
  if(command==="dispatch"){const target=args[0];if(!target)throw new Error("usage: hunt dispatch <target> [limit]");const limit=Math.max(1,Number(args[1]??4));console.log(JSON.stringify(await resumePersistedDispatch(root,target,limit),null,2));return}
  if(command==="task-complete"){const target=args[0];const taskId=args[1];const state=args[2] as "completed"|"failed"|"blocked";if(!target||!taskId||!["completed","failed","blocked"].includes(state))throw new Error("usage: hunt task-complete <target> <taskId> <completed|failed|blocked>");console.log(JSON.stringify(await completeDispatchedTask(root,target,taskId,state),null,2));return}
  if(command==="complete"){const target=args[0];if(!target)throw new Error("usage: hunt complete <target>");if(!(await canComplete(root,target)))throw new Error("COVERAGE_GATE_FAILED");console.log(JSON.stringify(await updateMission(root,target,"COMPLETED"),null,2));return}
  console.error("commands: init scope status resume plan-status dispatch task-complete complete");process.exit(1)
}
await main()
