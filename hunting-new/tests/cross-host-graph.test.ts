import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { initMission } from "../src/mission"
import { ingestCyberStrikeRequest } from "../src/cyberstrike-intake"
import { rememberTargetIntelligence, loadTargetIntelligence } from "../src/target-intelligence"

describe("cross-host intake enrichment", () => {
  test("records JS, redirect, and API-host relations with scope verdicts", async () => {
    const root=await mkdtemp(path.join(tmpdir(),"cyberstrike-graph-"))
    try{
      const target="example.test"
      await initMission(root,target,[
        {value:target},
        {value:"api.example.test"},
        {value:"cdn.example.test"},
      ])
      await rememberTargetIntelligence(root,target,{
        jsAssets:[{id:"js-1",url:"https://cdn.example.test/app.js",observedAt:1}],
      })
      await ingestCyberStrikeRequest(root,{
        target,
        sessionId:"s1",
        pageUrl:"https://example.test/page",
        jsAssetIds:["js-1"],
        request:{
          id:"req-1",
          method:"GET",
          url:"https://api.example.test/api/users",
          host:"api.example.test",
          path:"/api/users",
          observedAt:2,
        },
        response:{
          id:"res-1",
          status:302,
          headers:{location:"https://external.example.net/login"},
          observedAt:3,
        },
      })
      const state=await loadTargetIntelligence(root,target)
      expect(state.assetRelations.some(x=>x.kind==="observed-js" && x.toHost==="cdn.example.test" && x.scope==="in-scope")).toBe(true)
      expect(state.assetRelations.some(x=>x.kind==="api-host" && x.toHost==="api.example.test")).toBe(true)
      expect(state.assetRelations.some(x=>x.kind==="redirect" && x.toHost==="external.example.net" && x.scope==="out-of-scope")).toBe(true)
    }finally{
      await rm(root,{recursive:true,force:true})
    }
  })
})
