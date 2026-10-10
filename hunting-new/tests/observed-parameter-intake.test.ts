import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { describe, expect, test } from "bun:test"
import { ingestCyberStrikeRequest } from "../src/cyberstrike-intake"
import { initMission } from "../src/mission"
import { loadTargetIntelligence } from "../src/target-intelligence"
import { signalEngineFromCorrelation } from "../src/signals"

describe("observed parameters across session intake, persistence, and routing", () => {
  test("persists normalized request slots and emits a parameter signal", async () => {
    const root=await mkdtemp(path.join(os.tmpdir(),"observed-param-intake-"))
    const target="params.example"
    try{
      await initMission(root,target,[{value:target}])
      await ingestCyberStrikeRequest(root,{
        target,
        sessionId:"param-session",
        request:{
          id:"req-parameter-1",
          method:"POST",
          url:"https://params.example/api/items",
          host:"params.example",
          path:"/api/items",
          observedAt:1234,
        },
        observedParams:[
          {loc:"body",name:"tenant_id",value:"tenant-7",retained:true},
        ],
      })
      const state=await loadTargetIntelligence(root,target)
      const stored=state.parameters.find(item=>item.name==="tenant_id" && item.location==="body")
      expect(stored).toBeDefined()
      expect(stored?.requestIds).toContain("req-parameter-1")
      expect(stored?.sources).toContain("observed")

      const engine=signalEngineFromCorrelation({
        target,
        requests:state.requests,
        responses:state.responses,
        jsAssets:state.jsAssets,
        functions:state.functions,
        parameters:state.parameters,
        apiSources:state.apiSources,
        edges:state.edges,
      })
      expect(engine.forTarget(target).some(signal=>
        signal.signal==="parameter_discovered" && signal.metadata?.name==="tenant_id"
      )).toBe(true)
    }finally{
      await rm(root,{recursive:true,force:true})
    }
  })
})
