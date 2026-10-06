import { hydrateGraph } from "./correlation"
import { ingestAndPersistObservation } from "./intake"
import { loadTargetIntelligence } from "./target-intelligence"

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
}

export async function ingestCyberStrikeRequest(
  root:string,
  input:CyberStrikeIntakeRecord,
):Promise<void>{
  const intelligence=await loadTargetIntelligence(root,input.target)
  const graph=hydrateGraph({
    requests:intelligence.requests,
    responses:intelligence.responses,
    assets:intelligence.jsAssets,
    functions:intelligence.functions,
    edges:intelligence.edges,
  })
  await ingestAndPersistObservation(root,input.target,graph,{
    sessionId:input.sessionId,
    request:input.request,
    response:input.response,
    jsAssetIds:input.jsAssetIds,
    functionIds:input.functionIds,
  })
}
