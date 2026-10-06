import { hydrateGraph } from "./correlation"
import { ingestAndPersistObservation } from "./intake"
import { loadTargetIntelligence } from "./target-intelligence"
import { loadMission } from "./mission"
import { buildAssetRelation } from "./cross-host-graph"
import type { ParamSlot } from "../../packages/cyberstrike/src/session/normalize/types"
import { discoverParameters } from "./parameter-discovery"

export interface CyberStrikeIntakeRecord{
  target:string
  sessionId:string
  request:{
    id:string
    method:string
    url:string
    host?:string
    path?:string
    credentialId?:string
    accountLabel?:string
    observedAt?:number
  }
  response?:{
    id:string
    status:number
    headers?:Record<string,string>
    contentType?:string
    bodyHash?:string
    observedAt?:number
  }
  pageUrl?:string
  jsAssetIds?:string[]
  functionIds?:string[]
  observedParams?:ParamSlot[]
}

export async function ingestCyberStrikeRequest(
  root:string,
  input:CyberStrikeIntakeRecord,
):Promise<void>{
  const intelligence=await loadTargetIntelligence(root,input.target)
  const mission=await loadMission(root,input.target)
  const graph=hydrateGraph({
    requests:intelligence.requests,
    responses:intelligence.responses,
    assets:intelligence.jsAssets,
    functions:intelligence.functions,
    edges:intelligence.edges,
  })
  const parameters=discoverParameters({
    endpoint:input.request.path ?? input.request.url,
    requestId:input.request.id,
    observedAt:input.request.observedAt ?? Date.now(),
    slots:input.observedParams ?? [],
  })
  await ingestAndPersistObservation(root,input.target,graph,{
    sessionId:input.sessionId,
    request:input.request,
    response:input.response,
    pageUrl:input.pageUrl,
    jsAssetIds:input.jsAssetIds,
    functionIds:input.functionIds,
    parameters,
  })

  const host=input.request.host
  if(host && mission){
    const relation=buildAssetRelation(
      input.target,
      host,
      "observed-request",
      "cyberstrike:session-ingest",
      mission.scope,
      1,
      input.request.observedAt ?? Date.now(),
    )
    await import("./target-intelligence").then(({rememberTargetIntelligence}) =>
      rememberTargetIntelligence(root,input.target,{assetRelations:[relation]})
    )
  }
}
