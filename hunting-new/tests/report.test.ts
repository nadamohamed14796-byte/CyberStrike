import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { initMission } from "../src/mission"
import { createReportRecord, transitionReport } from "../src/report"

describe("report lifecycle", () => {
  test("rejects skipping submission", async () => {
    const root=await mkdtemp(path.join(tmpdir(),"cyberstrike-report-"))
    try{
      await initMission(root,"example.test",[{ value: "example.test"}])
      const finding={
        id:"finding-1",fingerprint:"fp-1",target:"example.test",title:"Test",severity:"high" as const,status:"validated" as const,
        hypothesisId:"hyp-1",attemptIds:["a1"],evidenceIds:["e1"],requestIds:["r1"],responseIds:["s1"],jsAssetIds:[],functionIds:[],accountLabels:["user"],
        summary:"summary",impact:"impact",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
      }
      const report=await createReportRecord(root,finding,"/tmp/report.md")
      await expect(transitionReport(root,"example.test",report.id,"accepted")).rejects.toThrow("REPORT_STATE_CONFLICT")
      const submitted=await transitionReport(root,"example.test",report.id,"submitted")
      expect(submitted.status).toBe("submitted")
      const accepted=await transitionReport(root,"example.test",report.id,"accepted")
      expect(accepted.status).toBe("accepted")
    }finally{
      await rm(root,{recursive:true,force:true})
    }
  })
})
