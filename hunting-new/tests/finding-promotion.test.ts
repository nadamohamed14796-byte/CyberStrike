import { describe, expect, test } from "bun:test"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { initMission } from "../src/mission"
import { upsertHypothesis } from "../src/hypothesis-store"
import { appendEvidence } from "../src/evidence-store"
import { createEvidence } from "../src/evidence"
import { promoteValidatedHypothesis } from "../src/finding-promotion"

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
    const response=createEvidence({kind:"response",sourceId:"res-1",requestId:"req-1",responseId:"res-1",confidence:.95,details:"response"})
    const attempt=createEvidence({kind:"attempt",sourceId:"attempt-1",attemptId:"attempt-1",confidence:.95,details:"validation"})
    await appendEvidence(root,target,request)
    await appendEvidence(root,target,response)
    await appendEvidence(root,target,attempt)

    const result=await promoteValidatedHypothesis(root,target,{
      hypothesisId:"hyp-1",title:"Validated issue",severity:"high",
      summary:"A reproducible security behavior was observed.",
      impact:"A separate account can access protected data.",
      remediation:"Enforce server-side authorization.",
      validation:{decision:"eligible",reasons:[],evidenceIds:[request.id,response.id,attempt.id]},
    })

    expect(result.reportable).toBe(true)
    expect(result.finding.status).toBe("validated")
  })
})
