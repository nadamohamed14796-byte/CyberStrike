import { hydrateGraph } from "./correlation"
import { ingestAndPersistObservation } from "./intake"
import { loadTargetIntelligence } from "./target-intelligence"
import { loadMission } from "./mission"
import { buildAssetRelation } from "./cross-host-graph"
import type { ParamSlot } from "../../packages/cyberstrike/src/session/normalize/types"
import { discoverParameters } from "./parameter-discovery"
import { renderTargetNotes } from "./target-notes"

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
    headerNames?:string[]
    cookieNames?:string[]
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
  await renderTargetNotes(root,input.target)

  if(!mission)return
  const observedAt=input.request.observedAt ?? Date.now()
  const relations:ReturnType<typeof buildAssetRelation>[]=[]
  const addHost=(host:string|undefined,kind:"observed-request"|"observed-js"|"redirect"|"api-host",source:string,confidence=1)=>{
    if(!host)return
    const relation=buildAssetRelation(input.target,host,kind,source,mission.scope,confidence,observedAt)
    if(!relations.some(item=>item.id===relation.id))relations.push(relation)
  }

  addHost(input.request.host,"observed-request","cyberstrike:session-ingest")

  try{
    const requestHost=new URL(input.request.url).hostname
    if(requestHost && requestHost!==input.target.replace(/^[a-z]+:\/\//i,"").split("/")[0].split(":")[0].toLowerCase()){
      addHost(requestHost,
        /\/(?:api|graphql|rpc)(?:\/|$)/i.test(input.request.path ?? "") ? "api-host" : "observed-request",
        "cyberstrike:request-url",
        .95)
    }
  }catch{}

  if(input.pageUrl){
    try{ addHost(new URL(input.pageUrl).hostname,"observed-js","cyberstrike:page-url",.8) }catch{}
  }

  const latest=await loadTargetIntelligence(root,input.target)
  for(const id of input.jsAssetIds ?? []){
    const asset=latest.jsAssets.find(item=>item.id===id)
    if(!asset)continue
    try{ addHost(new URL(asset.url).hostname,"observed-js","cyberstrike:js-asset",.9) }catch{}
  }

  const location=input.response?.headers?.location ?? input.response?.headers?.Location
  if(location){
    try{ addHost(new URL(location,input.request.url).hostname,"redirect","cyberstrike:response-location",.85) }catch{}
  }

  if(relations.length){
    await import("./target-intelligence").then(({rememberTargetIntelligence}) =>
      rememberTargetIntelligence(root,input.target,{assetRelations:relations})
    )
  }
}
