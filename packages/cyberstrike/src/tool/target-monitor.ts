import z from "zod"
import { Tool } from "./tool"
import { TargetMonitor, type Observation } from "../methodology/target-monitor"
const observation=z.object({ kind:z.enum(["subdomain","url","endpoint","javascript","technology","response"]), value:z.string(), fingerprint:z.string().optional() })
export const TargetMonitorTool = Tool.define("target_monitor", {
  description:"Create or diff an authorized target baseline. Monitoring never launches active testing automatically.",
  parameters:z.object({ target:z.string(), mode:z.enum(["baseline","diff"]), observations:z.array(observation), scope_items:z.array(z.string()).default([]) }),
  async execute(params) {
    if (params.mode==="baseline") { const rows=await TargetMonitor.baseline(params.target, params.observations as Observation[]); return { title:"Target baseline saved", output:`Saved ${rows.length} observations.`, metadata:{count:rows.length} } }
    const changes=await TargetMonitor.diff(params.target, params.observations as Observation[], params.scope_items);
    return { title:`Target changes: ${changes.length}`, output:JSON.stringify(changes,null,2), metadata:{changes} }
  },
})