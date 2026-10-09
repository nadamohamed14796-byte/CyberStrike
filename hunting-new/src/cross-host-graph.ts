import { checkScope, type ScopeRule } from "./scope"

export type AssetRelationKind="observed-request"|"observed-js"|"redirect"|"api-host"

export interface AssetRelation{
  id:string
  fromTarget:string
  toHost:string
  kind:AssetRelationKind
  source:string
  confidence:number
  scope:"in-scope"|"out-of-scope"|"unknown"
  observedAt:number
}

export function buildAssetRelation(
  target:string,
  host:string,
  kind:AssetRelationKind,
  source:string,
  scopeRules:ScopeRule[],
  confidence=1,
  observedAt=Date.now(),
):AssetRelation{
  const normalizedHost=host.trim().toLowerCase().replace(/\.$/,"")
  const decision=normalizedHost ? checkScope(normalizedHost,scopeRules) : {allowed:false,normalized:"",reason:"empty-target"}
  const scope=normalizedHost
    ? decision.allowed ? "in-scope" : "out-of-scope"
    : "unknown"
  return {
    id:"asset-rel_"+Bun.hash([
      target.toLowerCase(),
      normalizedHost,
      kind,
      source,
    ].join("|")).toString(16),
    fromTarget:target,
    toHost:normalizedHost,
    kind,
    source,
    confidence:Math.max(0,Math.min(1,confidence)),
    scope,
    observedAt,
  }
}

export function dedupeAssetRelations(items:AssetRelation[]):AssetRelation[]{
  const seen=new Set<string>()
  return items.filter(item=>{
    if(seen.has(item.id))return false
    seen.add(item.id)
    return true
  })
}
