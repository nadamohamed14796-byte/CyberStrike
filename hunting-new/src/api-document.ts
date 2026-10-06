import type { ApiSource } from "./api-diff"

const HTTP_METHODS=new Set(["get","post","put","patch","delete","head","options","trace"])

export interface OpenApiDocument {
  servers?: Array<{url?:string}>
  basePath?: string
  host?: string
  schemes?: string[]
  paths?: Record<string,Record<string,unknown>>
}

function joinEndpoint(base:string,path:string){
  const value=(base.replace(//+$/,"") + "/" + path.replace(/^/+/,"")).replace(//+/g,"/")
  return value.replace(/^https?:/([^/])/,"https://$1")
}

export function extractApiSources(document:OpenApiDocument):ApiSource[]{
  const base=document.servers?.find(item=>item.url)?.url
    ?? (document.host ? `${document.schemes?.[0]??"https"}://${document.host}` : "")
    || document.basePath
    || ""
  const output:ApiSource[]=[]
  for(const [route,operations] of Object.entries(document.paths??{})){
    for(const method of Object.keys(operations)){
      if(!HTTP_METHODS.has(method.toLowerCase()))continue
      output.push({
        endpoint:joinEndpoint(base,route),
        method:method.toUpperCase(),
        source:"swagger",
      })
    }
  }
  return [...new Map(output.map(item=>[`${item.source}|${item.method}|${item.endpoint}`,item])).values()]
}

export function parseOpenApiJson(text:string):ApiSource[]{
  let value:unknown
  try{ value=JSON.parse(text) }catch{ return [] }
  if(!value || typeof value!=="object")return []
  return extractApiSources(value as OpenApiDocument)
}
