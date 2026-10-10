import path from "node:path"
import { readJson } from "./store"

export type HuntingRole = "primary-hunter" | "validator" | "correlator" | "reviewer"
export interface ConfiguredScopeRule { value: string; path?: string; protocols?: string[]; ports?: number[]; exclude?: boolean }
export interface ConfiguredAgentProfile {
  name: string
  agentId: string
  runtime: string
  role: string
  purpose: string
  inputs: string[]
  outputs: string[]
  constraints: string[]
}
export interface ConfiguredSource {
  name: string; url: string; enabled: boolean; type?: string; frequency?: string; trust_level?: string; sourcePath: string
}
interface RuntimeRegistry {
  runtime?: string; runtime_package?: string; version?: string; adapters?: Record<string,string>
  hunting_layer?: Record<string,string>; entrypoints?: Record<string,string>
}
export interface HuntingRuntimeConfiguration {
  scope: { mode: string; unknownTarget: string; rules: ConfiguredScopeRule[]; exclusions: ConfiguredScopeRule[] }
  policy: {
    defaultAttemptBudget: number; maxTaskRecords: number; requireProvenance: boolean; requireScopeGate: boolean
    requireAuthorizationGate: boolean; requireRateLimitGate: boolean; requireRiskGate: boolean
    neverStoreSecrets: boolean; rewriteSkills: boolean
  }
  agentByRole: Partial<Record<HuntingRole,string>>
  agentProfiles: Record<string,ConfiguredAgentProfile>
  researchSources: ConfiguredSource[]; referenceSources: ConfiguredSource[]; registry: RuntimeRegistry | null
}
async function readText(file:string):Promise<string>{try{return await Bun.file(file).text()}catch{return ""}}
function indentation(line:string):number{return line.match(/^\s*/)?.[0].length??0}
function scalar(text:string,key:string,fallback=""):string{
  const match=text.match(new RegExp("^\\s*"+key+":\\s*(.*?)\\s*$","m"))
  return match?match[1].replace(/\s+#.*$/,"").trim().replace(/^["']|["']$/g,""):fallback
}
function bool(text:string,key:string,fallback:boolean):boolean{
  const value=scalar(text,key,fallback?"true":"false").toLowerCase()
  return value==="true"?true:value==="false"?false:fallback
}
function numeric(text:string,key:string,fallback:number):number{
  const value=Number(scalar(text,key,String(fallback)))
  return Number.isFinite(value)?value:fallback
}
function section(text:string,name:string):string{
  const lines=text.split(/\r?\n/)
  const start=lines.findIndex(line=>new RegExp("^"+name+":\\s*(?:#.*)?$").test(line))
  if(start<0)return ""
  const output:string[]=[]
  for(let i=start+1;i<lines.length;i++){
    if(lines[i].trim()&&indentation(lines[i])===0&&/^[A-Za-z0-9_-]+:\s*/.test(lines[i]))break
    output.push(lines[i])
  }
  return output.join("\n")
}
function parseInlineList(value:string):string[]{
  const trimmed=value.trim()
  if(!trimmed||trimmed==="[]")return []
  if(trimmed.startsWith("[")&&trimmed.endsWith("]"))return trimmed.slice(1,-1).split(",").map(x=>x.trim().replace(/^["']|["']$/g,"")).filter(Boolean)
  return [trimmed.replace(/^["']|["']$/g,"")]
}
/** Parse the bounded YAML list-of-mappings subset used by repository config files. */
function listRecords(text:string,key:string):Array<Record<string,string>>{
  const lines=text.split(/\r?\n/)
  const start=lines.findIndex(line=>new RegExp("^\\s*"+key+":\\s*(?:\\[\\])?\\s*(?:#.*)?$").test(line))
  if(start<0||/\[\]\s*$/.test(lines[start]))return []
  const baseIndent=indentation(lines[start])
  let itemIndent=-1
  let current:Record<string,string>|undefined
  const result:Array<Record<string,string>>=[]
  const setField=(record:Record<string,string>,value:string)=>{
    const match=value.trim().match(/^([A-Za-z0-9_-]+):\s*(.*?)\s*$/)
    if(match)record[match[1]]=match[2].replace(/\s+#.*$/,"").trim().replace(/^["']|["']$/g,"")
    else if(value.trim())record.value=value.trim().replace(/^["']|["']$/g,"")
  }
  for(let i=start+1;i<lines.length;i++){
    const line=lines[i]
    if(!line.trim()||line.trim().startsWith("#"))continue
    const depth=indentation(line)
    if(depth<=baseIndent)break
    if(/^\s*-\s*/.test(line)){itemIndent=depth;current={};result.push(current);setField(current,line.replace(/^\s*-\s*/,""));continue}
    if(current&&depth>itemIndent)setField(current,line.trim())
  }
  return result
}
function namedSection(text:string,key:string):Map<string,Record<string,string>>{
  const block=section(text,key)
  const result=new Map<string,Record<string,string>>()
  let current:Record<string,string>|undefined
  for(const line of block.split(/\r?\n/)){
    const header=line.match(/^  ([A-Za-z0-9_-]+):\s*$/)
    if(header){current={};result.set(header[1],current);continue}
    const field=line.match(/^    ([A-Za-z0-9_-]+):\s*(.*?)\s*$/)
    if(field&&current)current[field[1]]=field[2].replace(/\s+#.*$/,"").trim().replace(/^["']|["']$/g,"")
  }
  return result
}
function parseAgentProfiles(text:string):Record<string,ConfiguredAgentProfile>{
  const profiles:Record<string,ConfiguredAgentProfile>={}
  let current:ConfiguredAgentProfile|undefined
  let currentField=""
  for(const line of section(text,"agents").split(/\r?\n/)){
    const header=line.match(/^  ([A-Za-z0-9_-]+):\s*$/)
    if(header){
      current={
        name:header[1],agentId:header[1],runtime:"",role:"",purpose:"",
        inputs:[],outputs:[],constraints:[],
      }
      profiles[current.name]=current
      currentField=""
      continue
    }
    if(!current)continue
    const field=line.match(/^    ([A-Za-z0-9_-]+):\s*(.*?)\s*$/)
    if(field){
      currentField=field[1]
      const value=field[2].replace(/\s+#.*$/,"").trim().replace(/^["']|["']$/g,"")
      if(currentField==="agent_id")current.agentId=value||current.name
      else if(currentField==="runtime")current.runtime=value
      else if(currentField==="role")current.role=value
      else if(currentField==="purpose")current.purpose=/^[>|]/.test(value)?"":value
      else if(currentField==="inputs"||currentField==="outputs"||currentField==="constraints"){
        current[currentField]=parseInlineList(value)
      }
      continue
    }
    const item=line.match(/^      -\s*(.*?)\s*$/)
    if(item&&(currentField==="inputs"||currentField==="outputs"||currentField==="constraints")){
      current[currentField].push(item[1].trim().replace(/^["']|["']$/g,""))
      continue
    }
    if(currentField==="purpose"&&line.trim()&&indentation(line)>=6){
      current.purpose=(current.purpose+" "+line.trim()).trim()
    }
  }
  return profiles
}
function parseScopeRule(record:Record<string,string>,forceExclude=false):ConfiguredScopeRule|null{
  const value=record.value??record.host??""
  if(!value)return null
  const protocols=parseInlineList(record.protocols??"")
  const ports=parseInlineList(record.ports??"").map(Number).filter(Number.isFinite)
  return {value,...(record.path?{path:record.path}:{}),...(protocols.length?{protocols}:{}),...(ports.length?{ports}:{}),exclude:forceExclude||record.exclude?.toLowerCase()==="true"}
}
function parseSources(text:string,sourcePath:string):ConfiguredSource[]{
  return listRecords(text,"sources").flatMap(record=>{
    if(!record.name||!record.url||!/^https?:\/\//i.test(record.url))return []
    return [{name:record.name,url:record.url,enabled:record.enabled?.toLowerCase()!=="false",
      ...(record.type?{type:record.type}:{}),...(record.frequency?{frequency:record.frequency}:{}),
      ...(record.trust_level?{trust_level:record.trust_level}:{}),sourcePath}]
  })
}

export async function loadHuntingRuntimeConfiguration(root:string):Promise<HuntingRuntimeConfiguration>{
  const configDir=path.join(root,"config")
  const policiesPath=path.join(configDir,"policies.yaml")
  const [scopeText,policiesText,agentsText,sourcesText,referencesText]=await Promise.all([
    readText(path.join(configDir,"scope.yaml")),readText(policiesPath),readText(path.join(configDir,"agents.yaml")),
    readText(path.join(configDir,"sources.yaml")),readText(path.join(configDir,"reference-sources.yaml")),
  ])
  const scopeBlock=section(scopeText,"scope")
  const missionPolicy=section(policiesText,"mission")
  const validationPolicy=section(policiesText,"validation")
  const safetyPolicy=section(policiesText,"safety")
  const learningPolicy=section(policiesText,"learning")
  const contextPolicy=section(policiesText,"context")
  const rules=listRecords(scopeBlock,"rules").flatMap(record=>{const rule=parseScopeRule(record);return rule?[rule]:[]})
  const exclusions=listRecords(scopeBlock,"exclusions").flatMap(record=>{const rule=parseScopeRule(record,true);return rule?[rule]:[]})
  const agentProfiles=parseAgentProfiles(agentsText)
  const agentByRole:Partial<Record<HuntingRole,string>>={}
  const roleSources:Array<[HuntingRole,string]>=[["primary-hunter","recon"],["validator","verifier"],["correlator","javascript"],["reviewer","reporter"]]
  for(const [role,sectionName] of roleSources){const agentId=agentProfiles[sectionName]?.agentId;if(agentId)agentByRole[role]=agentId}
  const registry=await readJson<RuntimeRegistry|null>(path.join(root,"runtime","registry","registry.json"),null)
  return {
    scope:{mode:scalar(scopeBlock,"mode","explicit"),unknownTarget:scalar(scopeBlock,"unknown_target","block"),rules,exclusions},
    policy:{
      defaultAttemptBudget:Math.max(1,Math.min(20,Math.floor(numeric(validationPolicy,"default_attempt_budget",20)))),
      maxTaskRecords:Math.max(1,Math.min(500,Math.floor(numeric(contextPolicy,"max_task_records",40)))),
      requireProvenance:bool(missionPolicy,"require_provenance",true),
      requireScopeGate:bool(safetyPolicy,"require_scope_gate",true),
      requireAuthorizationGate:bool(safetyPolicy,"require_authorization_gate",true),
      requireRateLimitGate:bool(safetyPolicy,"require_rate_limit_gate",true),
      requireRiskGate:bool(safetyPolicy,"require_risk_gate",true),
      neverStoreSecrets:bool(safetyPolicy,"never_store_secrets",true),
      rewriteSkills:bool(learningPolicy,"rewrite_skills",false),
    },
    agentByRole,
    agentProfiles,
    researchSources:parseSources(sourcesText,path.join(configDir,"sources.yaml")),
    referenceSources:parseSources(referencesText,path.join(configDir,"reference-sources.yaml")),
    registry,
  }
}

export async function validateHuntingRuntimeRegistry(root:string):Promise<string[]>{
  const errors:string[]=[]
  const repoRoot=path.resolve(root,"..")
  for(const file of ["agents.yaml","policies.yaml","scope.yaml","skills.yaml","sources.yaml","reference-sources.yaml"]){
    if(!(await Bun.file(path.join(root,"config",file)).exists()))errors.push("missing-config:"+file)
  }
  const config=await loadHuntingRuntimeConfiguration(root)
  const registry=config.registry
  if(!registry)return [...errors,"missing-runtime-registry"]
  if(registry.runtime!=="cyberstrike")errors.push("unsupported-runtime:"+String(registry.runtime))
  if(!registry.runtime_package)errors.push("missing-runtime-package")
  else{
    const packageFile=path.join(repoRoot,registry.runtime_package,"package.json")
    if(!(await Bun.file(packageFile).exists()))errors.push("missing-runtime-package-file:"+registry.runtime_package)
    else{
      const runtimePackage=await readJson<{version?:string}|null>(packageFile,null)
      if(registry.version&&runtimePackage?.version&&registry.version!==runtimePackage.version)errors.push("runtime-version-mismatch:"+registry.version+"!="+runtimePackage.version)
    }
  }
  for(const [name,target] of Object.entries(registry.hunting_layer??{})){
    if(!(await Bun.file(path.join(repoRoot,target)).exists()))errors.push("missing-registry-target:"+name+":"+target)
  }
  for(const [name,target] of Object.entries(registry.entrypoints??{})){
    if(!(await Bun.file(path.join(repoRoot,target)).exists()))errors.push("missing-entrypoint:"+name+":"+target)
  }
  for(const name of ["session","agents","skills","browser","mcp"])if(!registry.adapters?.[name])errors.push("missing-adapter:"+name)
  const policy=config.policy
  if(policy.requireScopeGate!==true)errors.push("unsafe-policy:require_scope_gate")
  if(policy.requireAuthorizationGate!==true)errors.push("unsafe-policy:require_authorization_gate")
  if(policy.requireRateLimitGate!==true)errors.push("unsafe-policy:require_rate_limit_gate")
  if(policy.requireRiskGate!==true)errors.push("unsafe-policy:require_risk_gate")
  if(policy.requireProvenance!==true)errors.push("unsafe-policy:require_provenance")
  if(policy.neverStoreSecrets!==true)errors.push("unsafe-policy:never_store_secrets")
  if(policy.rewriteSkills!==false)errors.push("unsafe-policy:rewrite_skills")
  if(config.scope.unknownTarget.toLowerCase()!=="block")errors.push("unsafe-policy:unknown_target")
  return errors
}
