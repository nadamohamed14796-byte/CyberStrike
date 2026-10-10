import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { initMission } from "../src/mission"
import { upsertHypothesis } from "../src/hypothesis-store"
import { upsertChain } from "../src/chain-store"
import { checkpointPhase, resumeHuntingContext, selectNextHypothesis } from "../src/runtime-persistence"
import { saveTaskState } from "../src/task-state-store"

describe("resume hunting context", () => {
  test("restores active hypothesis, chain and next attempt", async () => {
    const root=await mkdtemp(path.join(tmpdir(),"cyberstrike-resume-"))
    const target="example.com"
    await initMission(root,target,[{ value: target}])

    await upsertHypothesis(root,target,{
      id:"hyp-1",target,signal:"idor",title:"IDOR requires validation",
      confidence:.8,status:"testing",evidenceIds:[],createdAt:new Date().toISOString(),
    })
    await upsertChain(root,target,{
      id:"chain-1",title:"IDOR chain",status:"testing",hypothesisIds:["hyp-1"],
      nodes:[],score:.8,
    })

    await checkpointPhase(root,target,"validation")
    const context=await resumeHuntingContext(root,target)

    expect(context.resumePhase).toBe("validation")
    expect(context.activeHypotheses.map(x=>x.id)).toContain("hyp-1")
    expect(context.activeChains.map(x=>x.id)).toContain("chain-1")
    expect(context.nextAttemptNumber["hyp-1"]).toBe(1)
    expect(selectNextHypothesis(context)?.id).toBe("hyp-1")
  })

  test("recovers stale running tasks at the shared resume boundary", async () => {
    const root=await mkdtemp(path.join(tmpdir(),"cyberstrike-resume-stale-"))
    const target="resume-stale.example"
    try{
      await initMission(root,target,[{value:target}])
      await saveTaskState(root,target,{
        taskId:"stale-task",
        state:"running",
        attempts:3,
        updatedAt:"2000-01-01T00:00:00.000Z",
      })
      const context=await resumeHuntingContext(root,target)
      const task=context.activeTasks.find(item=>item.taskId==="stale-task")
      expect(task?.state).toBe("pending")
      expect(task?.attempts).toBe(3)
    }finally{
      await rm(root,{recursive:true,force:true})
    }
  })
})
