import type { ParamSlot } from "../../packages/cyberstrike/src/session/normalize/types"
import type { ParameterCandidate } from "./target-intelligence"

export interface ParameterDiscoveryInput {
  endpoint: string
  requestId: string
  observedAt: number
  slots: ParamSlot[]
  source?: "observed" | "js" | "tool"
}

function stableId(endpoint:string, location:string, name:string):string {
  return "param_" + Bun.hash([endpoint,location,name].join("|")).toString(16)
}

export function discoverParameters(input:ParameterDiscoveryInput):ParameterCandidate[] {
  const source=input.source ?? "observed"
  const byKey=new Map<string,ParameterCandidate>()
  for(const slot of input.slots){
    const name=slot.name.trim()
    if(!name) continue
    const key=[input.endpoint,slot.loc,name.toLowerCase()].join("|")
    const previous=byKey.get(key)
    const item:ParameterCandidate={
      id:stableId(input.endpoint,slot.loc,name.toLowerCase()),
      name,
      location:slot.loc,
      endpoint:input.endpoint,
      requestIds:[input.requestId],
      sources:[source],
      confidence:source==="observed"?0.82:source==="js"?0.76:0.70,
      firstSeen:input.observedAt,
      lastSeen:input.observedAt,
    }
    if(!previous) byKey.set(key,item)
    else byKey.set(key,{
      ...previous,
      requestIds:[...new Set([...previous.requestIds,input.requestId])],
      sources:[...new Set([...previous.sources,source])],
      confidence:Math.max(previous.confidence,item.confidence),
      lastSeen:Math.max(previous.lastSeen,input.observedAt),
    })
  }
  return [...byKey.values()]
}

export function parameterSignals(candidates:ParameterCandidate[], target:string) {
  return candidates.map(candidate=>({
    signal:"parameter_discovered",
    source:"parameter-discovery",
    confidence:candidate.confidence,
    target,
    endpoint:candidate.endpoint,
    metadata:{
      parameterId:candidate.id,
      name:candidate.name,
      location:candidate.location,
      requestIds:candidate.requestIds,
      sources:candidate.sources,
    },
  }))
}


export function discoverRequestParametersFallback(input:{
  endpoint:string
  requestId:string
  observedAt:number
  rawRequest?:string
}):ParameterCandidate[]{
  const slots:ParamSlot[]=[]
  try{
    const parsed=new URL(input.endpoint)
    for(const name of parsed.searchParams.keys()) slots.push({loc:"query",name,value:"<observed>",retained:false})
  }catch{}
  const pathPart=input.endpoint.replace(/^https?:\/\/[^/]+/i,"")
  for(const match of pathPart.matchAll(/(?:^|[/:])\{([^}]+)\}/g)){
    slots.push({loc:"path",name:match[1],value:"<dynamic>",retained:false})
  }
  const body=(input.rawRequest ?? "").split(/\r?\n\r?\n/,2)[1] ?? ""
  for(const match of body.matchAll(/["']([A-Za-z_][A-Za-z0-9_.-]{0,127})["']\s*:/g)){
    slots.push({loc:"body",name:match[1],value:"<observed>",retained:false})
  }
  return discoverParameters({
    endpoint:input.endpoint,
    requestId:input.requestId,
    observedAt:input.observedAt,
    slots,
    source:"observed",
  })
}
