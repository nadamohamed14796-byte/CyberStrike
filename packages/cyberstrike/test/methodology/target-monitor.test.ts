import { describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import { TargetMonitor } from "../../src/methodology/target-monitor"
import { TargetWorkspace } from "../../src/tool/target-workspace"
describe("TargetMonitor",()=>{
  test("detects additions and changes without launching active testing",async()=>{
    const target="https://monitor.example.com"
    await TargetMonitor.baseline(target,[{kind:"url",value:"https://monitor.example.com/a"}])
    const changes=await TargetMonitor.diff(target,[{kind:"url",value:"https://monitor.example.com/a"},{kind:"url",value:"https://monitor.example.com/b"}],["monitor.example.com"])
    expect(changes.some((x)=>x.type==="added" && x.value.endsWith("/b"))).toBe(true)
    const workspace=TargetWorkspace.paths(target)
    await fs.rm(workspace.root,{recursive:true,force:true})
  })
})