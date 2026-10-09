import { describe, expect, test } from "bun:test"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { initMission } from "../src/mission"
import { upsertHypothesis } from "../src/hypothesis-store"
import { upsertChain } from "../src/chain-store"
import { checkpointPhase, resumeHuntingContext, selectNextHypothesis } from "../src/runtime-persistence"

describe("resume hunting context", () => {
  test("restores active hypothesis, chain and next attempt", async () => {
    const root=await mkdtemp(path.join(tmpdir(),"cyberstrike-resume-"))
    const target="example.com"
    await initMission(root,target,[{type:"host",value:target}])

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
})
