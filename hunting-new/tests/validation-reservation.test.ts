import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { initMission } from "../src/mission"
import { SignalEngine } from "../src/signals"
import { prepareMultiAgentPlan, prepareAgentTaskValidation } from "../src/multi-agent-runtime"
import { loadAttempts } from "../src/attempt-store"

describe("validation reservation", () => {
  test("concurrent validation preparation reuses one planned attempt", async () => {
    const root=await mkdtemp(path.join(tmpdir(),"cyberstrike-reservation-"))
    try{
      const target="example.test"
      await initMission(root,target,[{ value: target}])
      const engine=new SignalEngine()
      engine.emit({
        signal:"object_identifier_detected",
        source:"test",
        confidence:.9,
        target,
        endpoint:"/api/users/1",
        metadata:{requestId:"req-1"},
      })
      const prepared=await prepareMultiAgentPlan(root,engine,[{
        name:"idor",
        confidence_threshold:.7,
        required_signals:["object_identifier_detected"],
        optional_signals:[],
        dependencies:[],
        maximum_parallel_tasks:1,
      }],target)
      const taskId=prepared.plan.tasks[0].id
      const [a,b]=await Promise.all([
        prepareAgentTaskValidation(root,prepared.plan,taskId),
        prepareAgentTaskValidation(root,prepared.plan,taskId),
      ])
      expect(a.attempt.id).toBe(b.attempt.id)
      const state=await loadAttempts(root,target)
      expect(state.attempts.filter(x=>x.hypothesisId===a.hypothesis.id && x.state==="planned")).toHaveLength(1)
    }finally{
      await rm(root,{recursive:true,force:true})
    }
  })
})
