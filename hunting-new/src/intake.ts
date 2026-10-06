import { addRequest, addResponse, link, serializeGraph, type CorrelationGraph, type RequestNode, type ResponseNode, type JSAssetNode, type FunctionNode } from "./correlation"
import { rememberTargetIntelligence } from "./target-intelligence"

export interface NetworkObservation {
  sessionId: string
  request: { id: string; method: string; url: string; host?: string; path?: string; credentialId?: string; accountLabel?: string; observedAt?: number }
  response?: { id: string; status: number; headers?: Record<string,string>; contentType?: string; bodyHash?: string; observedAt?: number }
  jsAssetIds?: string[]
  jsAssets?: JSAssetNode[]
  functionIds?: string[]
  functions?: FunctionNode[]
}

export async function ingestAndPersistObservation(root:string,target:string,graph:CorrelationGraph,observation:NetworkObservation):Promise<void>{
  ingestObservation(graph,observation)
  const response=observation.response
  const observedAccount=observation.request.accountLabel?{id:observation.request.credentialId??"account:"+observation.request.accountLabel,label:observation.request.accountLabel,authenticationState:"authenticated" as const,firstSeen:observation.request.observedAt??Date.now(),lastSeen:observation.request.observedAt??Date.now()}:undefined
  await rememberTargetIntelligence(root,target,{accounts:observedAccount?[observedAccount]:[],requests:[graph.requests.get(observation.request.id)!],responses:response?[graph.responses.get(response.id)!]:[],jsAssets:[...graph.assets.values()],functions:[...graph.functions.values()],edges:serializeGraph(graph).edges,hypotheses:[],tags:[]})
}

export function ingestObservation(graph:CorrelationGraph,observation:NetworkObservation):void{
  const r=observation.request
  const request:RequestNode={...r,sessionId:observation.sessionId,observedAt:r.observedAt??Date.now(),source:"observed"}
  addRequest(graph,request)
  if(observation.response){const p=observation.response;const response:ResponseNode={...p,requestId:r.id,headers:p.headers??{},observedAt:p.observedAt??Date.now()};addResponse(graph,response)}
  for(const assetId of observation.jsAssetIds??[]){
    if(!graph.assets.has(assetId))graph.assets.set(assetId,{id:assetId,url:assetId,observedAt:r.observedAt??Date.now()})
    link(graph,{from:assetId,to:r.id,kind:"observed-on",confidence:1,evidence:"browser"})
  }
  for(const asset of observation.jsAssets??[])graph.assets.set(asset.id,asset)
  for(const functionId of observation.functionIds??[]){
    if(!graph.functions.has(functionId))graph.functions.set(functionId,{id:functionId,name:functionId})
    link(graph,{from:functionId,to:r.id,kind:"triggered-by",confidence:1,evidence:"browser"})
  }
  for(const fn of observation.functions??[])graph.functions.set(fn.id,fn)
}
