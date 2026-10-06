import { addRequest, addResponse, addParameter, link, serializeGraph, type CorrelationGraph, type RequestNode, type ResponseNode, type JSAssetNode, type FunctionNode } from "./correlation"
import { rememberTargetIntelligence, discoverRequestParameters } from "./target-intelligence"
import type { ParameterCandidate } from "./target-intelligence"
import { markDiscovered, stableLedgerId } from "./ledger"

export interface NetworkObservation {
  sessionId: string
  request: { id: string; method: string; url: string; host?: string; path?: string; credentialId?: string; accountLabel?: string; observedAt?: number }
  response?: { id: string; status: number; headers?: Record<string,string>; contentType?: string; bodyHash?: string; observedAt?: number }
  pageUrl?: string
  jsAssetIds?: string[]
  jsAssets?: JSAssetNode[]
  functionIds?: string[]
  functions?: FunctionNode[]
  parameters?: ParameterCandidate[]
}

export async function ingestAndPersistObservation(root:string,target:string,graph:CorrelationGraph,observation:NetworkObservation):Promise<void>{
  ingestObservation(graph,observation)
  const response=observation.response
  const observedAccount=(observation.request.accountLabel || observation.request.credentialId)?{
    id:observation.request.credentialId??"account:"+observation.request.accountLabel,
    label:observation.request.accountLabel??observation.request.credentialId!,
    authenticationState:"authenticated" as const,
    firstSeen:observation.request.observedAt??Date.now(),
    lastSeen:observation.request.observedAt??Date.now()
  }:undefined
  await rememberTargetIntelligence(root,target,{accounts:observedAccount?[observedAccount]:[],requests:[graph.requests.get(observation.request.id)!],responses:response?[graph.responses.get(response.id)!]:[],jsAssets:[...graph.assets.values()],functions:[...graph.functions.values()],edges:serializeGraph(graph).edges,parameters:[...new Map([...graph.parameters.values()].map(node=>[node.id,{id:node.id,name:node.name,location:node.location,endpoint:graph.requests.get(node.requestId)?.path ?? graph.requests.get(node.requestId)?.url ?? target,requestIds:[node.requestId],sources:node.source==="inferred"?["tool" as const]:node.source==="js"?["js" as const]:["observed" as const],confidence:node.source==="inferred"?0.70:node.source==="js"?0.80:0.90,firstSeen:node.observedAt,lastSeen:node.observedAt}])).values()],hypotheses:[],tags:[]})

  await markDiscovered(root,target,[
    {type:"request",id:observation.request.id,metadata:{method:observation.request.method,url:observation.request.url}},
    {type:"endpoint",id:stableLedgerId("endpoint",observation.request.path??observation.request.url),metadata:{method:observation.request.method,endpoint:observation.request.path??observation.request.url}},
    ...[...graph.parameters.values()].filter(node=>node.requestId===observation.request.id).map(node=>({type:"parameter",id:node.id,metadata:{name:node.name,location:node.location}})),
    ...[...graph.assets.values()].map(asset=>({type:"js",id:asset.id,metadata:{url:asset.url}})),
  ])
}

export function ingestObservation(graph:CorrelationGraph,observation:NetworkObservation):void{
  const r=observation.request
  const request:RequestNode={...r,sessionId:observation.sessionId,observedAt:r.observedAt??Date.now(),source:"observed"}
  addRequest(graph,request)
  if(observation.response){const p=observation.response;const response:ResponseNode={...p,requestId:r.id,headers:p.headers??{},observedAt:p.observedAt??Date.now()};addResponse(graph,response)}
  for(const parameter of observation.parameters ?? discoverRequestParameters(r as RequestNode)){
    addParameter(graph,{id:parameter.id,requestId:r.id,name:parameter.name,location:parameter.location,source:parameter.sources.includes("tool") ? "inferred" : parameter.sources.includes("js") ? "js" : "observed",observedAt:parameter.lastSeen})
  }
  for(const assetId of observation.jsAssetIds??[]){
    if(!graph.assets.has(assetId))graph.assets.set(assetId,{id:assetId,url:assetId,observedAt:r.observedAt??Date.now()})
    link(graph,{from:assetId,to:r.id,kind:"observed-on",confidence:1,evidence:"browser"})
  }
  for(const asset of observation.jsAssets??[])graph.assets.set(asset.id,asset)
  // Browser page context can correlate a request with JS assets already persisted
  // for that page, even when the capture did not provide explicit asset IDs.
  if(observation.pageUrl){
    for(const asset of graph.assets.values()){
      if(asset.pageUrl===observation.pageUrl){
        link(graph,{from:asset.id,to:r.id,kind:"observed-on",confidence:0.88,evidence:"browser"})
      }
    }
  }
  for(const functionId of observation.functionIds??[]){
    if(!graph.functions.has(functionId))graph.functions.set(functionId,{id:functionId,name:functionId})
    link(graph,{from:functionId,to:r.id,kind:"triggered-by",confidence:1,evidence:"browser"})
  }
  for(const fn of observation.functions??[])graph.functions.set(fn.id,fn)
}
