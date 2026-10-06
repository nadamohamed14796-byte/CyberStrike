import path from "node:path"
import crypto from "node:crypto"
import { ensureDir, readJson, writeJson } from "./store"

export interface WriteupInsight {
  signal: string
  strategies: string[]
  confidence: number
}

export interface WriteupRecord {
  id: string
  title: string
  sourcePath: string
  contentHash: string
  firstSeen: string
  lastSeen: string
  insights: WriteupInsight[]
  excerpt: string
}

interface WriteupState {
  writeups: WriteupRecord[]
  updatedAt: string
}

function file(root:string){
  return path.join(root,"intelligence","writeups.json")
}

function hash(content:string){
  return crypto.createHash("sha256").update(content).digest("hex")
}

const RULES:Array<[RegExp,string,string[]]>=[
  [/\bidor\b|broken object|bola/i,"object_identifier_detected",["account-context","identifier","parameter"]],
  [/\bgraphql\b/i,"graphql_detected",["request-shape","parameter","content-type"]],
  [/\bwaf\b|403|406|429|filter|firewall/i,"waf_signal_detected",["encoding","parameter","request-shape"]],
  [/\bjwt\b|authorization header/i,"jwt_detected",["header","account-context","alternate-client"]],
  [/\bwebsocket/i,"websocket_detected",["request-shape","parser","alternate-client"]],
  [/\bredirect\b|return_url|callback|next=/i,"redirect_parameter_detected",["parameter","encoding","path"]],
  [/\bsource.?map|\.map\b/i,"source_map_detected",["parser","path","alternate-client"]],
  [/\bauthoriz|privilege|access control|role/i,"authorization",["account-context","method","workflow"]],
  [/\bapi\b|endpoint|swagger|openapi/i,"endpoint_discovery",["parameter","method","request-shape"]],
]

export function extractWriteupInsights(content:string):WriteupInsight[]{
  return RULES.flatMap(([pattern,signal,strategies])=>{
    const matches=content.match(new RegExp(pattern.source,pattern.flags.replace("g","")))
    if(!matches)return []
    return [{signal,strategies:[...strategies],confidence:0.55}]
  })
}

export async function loadWriteups(root:string):Promise<WriteupState>{
  return (await readJson<WriteupState|null>(file(root),null)) ?? {writeups:[],updatedAt:new Date(0).toISOString()}
}

export async function ingestWriteup(
  root:string,
  input:{sourcePath:string;title?:string;content:string},
):Promise<WriteupRecord>{
  const content=input.content.slice(0,200_000)
  const contentHash=hash(content)
  const id="writeup_"+contentHash.slice(0,20)
  const now=new Date().toISOString()
  const record:WriteupRecord={
    id,
    title:(input.title??path.basename(input.sourcePath)).trim().slice(0,200),
    sourcePath:input.sourcePath,
    contentHash,
    firstSeen:now,
    lastSeen:now,
    insights:extractWriteupInsights(content),
    excerpt:content.slice(0,4000),
  }
  const state=await loadWriteups(root)
  const index=state.writeups.findIndex(x=>x.id===id)
  if(index<0)state.writeups.push(record)
  else state.writeups[index]={...state.writeups[index],...record,firstSeen:state.writeups[index].firstSeen}
  const next={writeups:state.writeups,updatedAt:now}
  await ensureDir(path.dirname(file(root)))
  await writeJson(file(root),next)
  return record
}

export async function ingestWriteupFile(root:string,sourcePath:string,title?:string){
  const content=await Bun.file(sourcePath).text()
  return ingestWriteup(root,{sourcePath,title,content})
}

export function strategyHintsFromWriteups(state:WriteupState,signal:string):string[]{
  const seen=new Set<string>()
  for(const writeup of state.writeups){
    for(const insight of writeup.insights){
      if(insight.signal!==signal)continue
      for(const strategy of insight.strategies)seen.add(strategy)
    }
  }
  return [...seen]
}
