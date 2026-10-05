import { describe, expect, test } from "bun:test"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { initMission } from "../src/mission"
import { upsertHypothesis } from "../src/hypothesis-store"
import { upsertChain } from "../src/chain-store"
import { PersistentAttemptLedger } from "../src/persistent-attempt-ledger"
import { recordAttemptLifecycle } from "../src/attempt-lifecycle"

describe("attempt lifecycle", () => {
  test("moves hypothesis and chain with attempt outcome", async () => {
    const root=await mkdtemp(path.join(tmpdir(),"cyberstrike-lifecycle-"))
    const target="example.com"
    await initMission(root,target,[{type:"host",value:target}])
    await upsertHypothesis(root,target,{
      id:"hyp-1",target,signal:"idor",title:"IDOR validation",
      confidence:.9,status:"pending",evidenceIds:[],createdAt:new Date().toISOString(),
    })
    await upsertChain(root,target,{
      id:"chain-1",title:"IDOR chain",status:"open",hypothesisIds:["hyp-1"],nodes:[],score:.9,
    })

    const ledger=await PersistentAttemptLedger.create(root,target)
    const attempt=await ledger.plan("hyp-1","identifier","adjacent-identifier","test access control")
    expect(attempt).toBeTruthy()

    const result=await recordAttemptLifecycle(root,target,attempt!.id,{
      state:"confirmed",evidenceIds:["ev-1"],resultSummary:"independent evidence confirmed impact",
    })

    expect(result.hypothesisStatus).toBe("confirmed")
    expect(result.chainStatuses["chain-1"]).toBe("confirmed")
  })
})
