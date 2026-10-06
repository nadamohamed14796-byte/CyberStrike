import { describe, expect, test } from "bun:test"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { initMission } from "../src/mission"
import { upsertHypothesis } from "../src/hypothesis-store"
import { appendEvidence } from "../src/evidence-store"
import { createEvidence } from "../src/evidence"
import { promoteValidatedHypothesis } from "../src/finding-promotion"
import { PersistentAttemptLedger } from "../src/persistent-attempt-ledger"

describe("finding promotion", () => {
  test("promotes a complete validated finding", async () => {
    const root=await mkdtemp(path.join(tmpdir(),"cyberstrike-promotion-"))
    const target="example.com"
    await initMission(root,target,[{type:"host",value:target}])
    await upsertHypothesis(root,target,{
      id:"hyp-1",target,signal:"access-control",title:"validation",
      confidence:.95,status:"confirmed",evidenceIds:[],createdAt:new Date().toISOString(),
    })

    const request=createEvidence({kind:"request",sourceId:"req-1",requestId:"req-1",confidence:.95,details:"request"})
    const response=createEvidence({kind:"response",sourceId:"res-1",requestId:"req-1",responseId:"res-1",confidence:.95,details:"response baseline"})
    const response2=createEvidence({kind:"response",sourceId:"res-2",requestId:"req-1",responseId:"res-2",confidence:.95,details:"response changed"})
    const functionEvidence=createEvidence({kind:"function",sourceId:"fn-1",functionId:"fn-1",confidence:.95,details:"server authorization function"})
    await appendEvidence(root,target,request)
    await appendEvidence(root,target,response)
    await appendEvidence(root,target,response2)
    await appendEvidence(root,target,functionEvidence)

    const ledger=await PersistentAttemptLedger.create(root,target)
    const attemptIds:string[]=[]
    for(let i=1;i<=20;i++){
      const attempt=await ledger.plan("hyp-1",i===1?"identifier":"parameter",`variant-${i}`,`validation ${i}`)
      expect(attempt).toBeTruthy()
      await ledger.record(attempt!.id,{state:"executed",evidenceIds:[response.id,response2.id,functionEvidence.id]})
      attemptIds.push(attempt!.id)
    }

    const result=await promoteValidatedHypothesis(root,target,{
      hypothesisId:"hyp-1",title:"Validated issue",severity:"high",
      summary:"A reproducible security behavior was observed.",
      impact:"A separate account can access protected data.",
      remediation:"Enforce server-side authorization.",
      validation:{decision:"eligible",reasons:[],evidenceIds:[request.id,response.id,response2.id,functionEvidence.id,...attemptIds]},
    })

    expect(result.reportable).toBe(true)
    expect(result.finding.status).toBe("validated")
  })
})
