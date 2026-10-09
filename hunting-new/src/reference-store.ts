import path from "node:path"
import { ensureDir, readJson, writeJson, withTargetMutationLock } from "./store"

export interface ReferenceRecord {
  id:string
  url:string
  skillName:string
  sourcePath:string
  firstSeen:string
  lastSeen:string
  useCount:number
}

interface ReferenceState {
  references:ReferenceRecord[]
  updatedAt:string
}

const URL_RE=/https?:\/\/[^\s<>"'\)\]\}]+/gi
let referenceQueue=Promise.resolve()
async function withReferenceMutation<T>(work:()=>Promise<T>):Promise<T>{
  const previous=referenceQueue
  let release!:()=>void
  referenceQueue=new Promise<void>(resolve=>{release=resolve})
  await previous
  try{return await work()}finally{release()}
}

function cleanUrl(value:string):string{
  return value.replace(/[.,;:!?]+$/,"")
}

function referenceId(url:string,skillName:string):string{
  return "ref_"+Bun.hash(skillName+"|"+url).toString(16)
}

function referenceFile(root:string){
  return path.join(root,"intelligence","references.json")
}

function catalogFile(root:string){
  return path.join(root,"config","reference-sources.yaml")
}

async function configuredGlobalReferences(root:string):Promise<Array<{name:string;url:string}>>{
  const file=catalogFile(root)
  if(!(await Bun.file(file).exists()))return []
  const lines=(await Bun.file(file).text()).split(/\r?\n/)
  const out:Array<{name:string;url:string}>=[]
  let current=""
  for(const line of lines){
    const name=line.match(/^\s+-\s+name:\s*(.+)$/)?.[1]?.trim()
    if(name){current=name;continue}
    const url=line.match(/^\s+url:\s*(\S+)$/)?.[1]?.trim()
    if(url && current)out.push({name:current,url:cleanUrl(url)})
  }
  return out
}

export async function loadReferences(root:string):Promise<ReferenceState>{
  return (await readJson<ReferenceState|null>(referenceFile(root),null)) ??
    {references:[],updatedAt:new Date(0).toISOString()}
}

export async function indexSkillReferences(
  root:string,
  skills:Array<{name:string;source_path?:string}>,
):Promise<ReferenceState>{
  return withReferenceMutation(async()=>{
    const state=await loadReferences(root)
    const byId=new Map(state.references.map(item=>[item.id,item]))
    for(const skill of skills){
    if(!skill.source_path)continue
    let content:string
    try{
      const candidates=[
        skill.source_path,
        path.resolve(process.cwd(),skill.source_path),
        path.resolve(root,"..",skill.source_path),
      ]
      let loaded:string|undefined
      for(const candidate of [...new Set(candidates)]){
        try{ loaded=await Bun.file(candidate).text(); if(loaded!==undefined)break }catch{}
      }
      if(loaded===undefined)continue
      content=loaded
    }catch{continue}
    for(const raw of content.match(URL_RE) ?? []){
      const url=cleanUrl(raw)
      if(!/^https?:\/\//i.test(url))continue
      const id=referenceId(url,skill.name)
      const existing=byId.get(id)
      const now=new Date().toISOString()
      byId.set(id,{
        id,url,skillName:skill.name,sourcePath:skill.source_path,
        firstSeen:existing?.firstSeen??now,lastSeen:now,useCount:existing?.useCount??0,
      })
    }
  }
    for(const source of await configuredGlobalReferences(root)){
      const id=referenceId(source.url,"__global__:"+source.name)
      const existing=byId.get(id)
      const now=new Date().toISOString()
      byId.set(id,{
        id,url:source.url,skillName:"__global__",
        sourcePath:catalogFile(root),
        firstSeen:existing?.firstSeen??now,lastSeen:now,useCount:existing?.useCount??0,
      })
    }
  const next={references:[...byId.values()].sort((a,b)=>a.skillName.localeCompare(b.skillName)||a.url.localeCompare(b.url)),updatedAt:new Date().toISOString()}
  await ensureDir(path.dirname(referenceFile(root)))
    await writeJson(referenceFile(root),next)
    return next
  })
}

export async function referencesForSkills(
  root:string,
  skillNames:string[],
  limit=8,
):Promise<ReferenceRecord[]>{
  const wanted=new Set(skillNames)
  return (await loadReferences(root)).references
    .filter(item=>wanted.has(item.skillName) || item.skillName==="__global__")
    .sort((a,b)=>
      (a.skillName==="__global__" ? 1 : 0)-(b.skillName==="__global__" ? 1 : 0) ||
      (b.useCount-a.useCount) ||
      a.url.localeCompare(b.url)
    )
    .slice(0,Math.max(0,limit))
}

export async function markReferencesUsed(
  root:string,
  ids:string[],
):Promise<ReferenceState>{
  const counts=new Map<string,number>()
  for(const id of ids)counts.set(id,(counts.get(id)??0)+1)
  if(!counts.size)return loadReferences(root)
  return withReferenceMutation(async()=>{
    const state=await loadReferences(root)
    const now=new Date().toISOString()
    const next={
      references:state.references.map(item=>{
        const increment=counts.get(item.id)??0
        return increment ? {...item,useCount:item.useCount+increment,lastSeen:now} : item
      }),
      updatedAt:now,
    }
    await ensureDir(path.dirname(referenceFile(root)))
    await writeJson(referenceFile(root),next)
    return next
  })
}
