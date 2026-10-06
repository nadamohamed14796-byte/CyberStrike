import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { initMission, canComplete, updateMission } from "../src/mission"
import { signalEngineFromCorrelation } from "../src/signals"
import { prepareMultiAgentPlan, dispatchPersistedTasks, executeTaskUntilTerminal } from "../src/multi-agent-runtime"
import { rememberTargetIntelligence } from "../src/target-intelligence"
import { ledgers } from "../src/ledger"
import { loadFindings } from "../src/finding-store"
import { loadReportsForTarget, transitionReport } from "../src/report"
import { loadLearning } from "../src/learning-store"

describe("hunting runtime end-to-end", () => {
  test("runs signal -> skill -> 20 attempts -> evidence -> validation -> finding -> report -> learning", async () => {
    const root=await mkdtemp(path.join(tmpdir(),"cyberstrike-e2e-"))
    try {
      const target="example.com"
      await initMission(root,target,[{type:"host",value:target}])

      const request={
        id:"req-1",
        sessionId:"s1",
        method:"GET",
        url:"https://example.com/api/users/123",
        host:target,
        path:"/api/users/123",
        credentialId:"cred-user",
        accountLabel:"user",
        observedAt:1,
        source:"observed" as const,
      }
      const responses=Array.from({length:20},(_,index)=>({
        id:"res-"+(index+1),
        requestId:"req-1",
        status:200,
        headers:{"content-type":"application/json"},
        contentType:"application/json",
        bodyHash:"body-"+(index+1),
        observedAt:index+2,
      }))
      const functionNode={id:"fn-1",name:"loadUser",assetId:"js-1"}
      const jsAsset={id:"js-1",url:"https://example.com/app.js",observedAt:1}
      await rememberTargetIntelligence(root,target,{
        requests:[request],
        responses,
        functions:[functionNode],
        jsAssets:[jsAsset],
        edges:[
          {from:"fn-1",to:"req-1",kind:"triggered-by",confidence:1,evidence:"browser"},
          {from:"js-1",to:"req-1",kind:"observed-on",confidence:1,evidence:"browser"},
        ],
      })

      const engine=signalEngineFromCorrelation({
        target,
        requests:[request],
        responses,
        jsAssets:[jsAsset],
        functions:[functionNode],
        edges:[
          {from:"fn-1",to:"req-1",kind:"triggered-by",confidence:1,evidence:"browser"},
          {from:"js-1",to:"req-1",kind:"observed-on",confidence:1,evidence:"browser"},
        ],
      })
      expect(engine.forTarget(target).some(x=>x.signal==="object_identifier_detected")).toBe(true)
      expect(engine.forTarget(target).some(x=>x.signal==="authenticated_endpoint")).toBe(true)

      const prepared=await prepareMultiAgentPlan(root,engine,[{
        name:"authorization-check",
        confidence_threshold:.7,
        required_signals:["object_identifier_detected","authenticated_endpoint"],
        optional_signals:[],
        dependencies:[],
        maximum_parallel_tasks:1,
      }],target)
      expect(prepared.plan.tasks).toHaveLength(1)

      await dispatchPersistedTasks(root,prepared,1)

      let calls=0
      const execution=await executeTaskUntilTerminal(root,prepared.plan,prepared.plan.tasks[0].id,async context=>{
        calls++
        const responseId="res-"+calls
        return {
          state:"confirmed" as const,
          attemptId:context.attemptId,
          requestId:"req-1",
          responseId,
          resultSummary:"Observed changed protected object response.",
          resultText:JSON.stringify({
            state:"confirmed",
            outcome:"clean",
            severity:"high",
            title:"Authorization behavior changed across validation variants",
            impact:"A protected authorization-sensitive response changes under a validation variant.",
            remediation:"Enforce server-side authorization and reject unauthorized request variants.",
            request_id:"req-1",
            response_id:responseId,
            result_summary:"Observed changed protected object response.",
            evidence:[],
            observations:["The protected object response changed across validation variants."],
          }),
        }
      })
      
      expect(calls).toBe(20)
      expect(execution.terminal).toBe(true)
      const last=execution.results.at(-1)
      expect(last?.state).toBe("confirmed")

      const findings=await loadFindings(root,target)
      expect(findings.findings.length).toBeGreaterThan(0)
      const finding=findings.findings[0]
      expect(finding.status).toBe("validated")
      expect(finding.requestIds).toContain("req-1")
      expect(finding.responseIds.length).toBeGreaterThan(1)
      expect(finding.functionIds).toContain("fn-1")
      expect(finding.jsAssetIds).toContain("js-1")
      expect(finding.attemptIds.length).toBe(20)

      const reports=await loadReportsForTarget(root,target)
      expect(reports.length).toBe(1)
      expect(reports[0].status).toBe("ready")

      const endpointLedger=ledgers(root,target).endpoint
      await endpointLedger.upsert({item_id:"endpoint-1",type:"endpoint",status:"VALIDATED"})
      const completion=await canComplete(root,target)
      expect(completion.complete).toBe(true)
      await updateMission(root,target,"COMPLETED","e2e-complete")

      await transitionReport(root,target,reports[0].id,"accepted",{submissionRef:"test"})
      const learning=await loadLearning(root,target)
      expect(learning.observations.some(x=>x.outcome==="confirmed")).toBe(true)
    } finally {
      await rm(root,{recursive:true,force:true})
    }
  })
})
