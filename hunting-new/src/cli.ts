import path from "node:path"
import { initMission,updateMission,canComplete } from "./mission"
import { checkScope } from "./scope"
import { coverageGate } from "./ledger"
const root=process.env.HUNT_ROOT??path.resolve(import.meta.dir,"..")
const [command,...args]=Bun.argv.slice(2)
async function main(){
  if(command==="init"){const target=args[0];if(!target)throw new Error("usage: hunt init <target>");console.log(JSON.stringify(await initMission(root,target,[{value:target}]),null,2));return}
  if(command==="scope"){const target=args[0];if(!target)throw new Error("usage: hunt scope <target>");console.log(JSON.stringify(checkScope(target,[{value:target}]),null,2));return}
  if(command==="status"){const target=args[0];if(!target)throw new Error("usage: hunt status <target>");console.log(JSON.stringify(await coverageGate(root,target),null,2));return}
  if(command==="resume"){const target=args[0];if(!target)throw new Error("usage: hunt resume <target>");console.log(JSON.stringify(await initMission(root,target,[]),null,2));return}
  if(command==="complete"){const target=args[0];if(!target)throw new Error("usage: hunt complete <target>");if(!(await canComplete(root,target)))throw new Error("COVERAGE_GATE_FAILED");console.log(JSON.stringify(await updateMission(root,target,"COMPLETED"),null,2));return}
  console.error("commands: init scope status resume complete");process.exit(1)
}
await main()
