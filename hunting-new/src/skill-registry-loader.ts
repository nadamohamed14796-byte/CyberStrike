import path from "node:path"
import { readdir, readFile } from "node:fs/promises"
import { readJson } from "./store"
import { SkillRegistry, type SkillMetadata } from "./skill-registry"

interface SkillIndexEntry {
  name:string
  description?:string
  category?:string
  tags?:string[]
  tech_stack?:string[]
  cwe_ids?:string[]
  files?:string[]
}

interface SkillIndex {
  skills:SkillIndexEntry[]
}

const WEB_SKILLS:SkillMetadata[]=[
  {
    name:"waf-xss-bypass",
    category:"web-application",
    description:"Authorized WAF-aware XSS validation using evidence-driven context variants.",
    triggers:["waf","firewall","filter","blocked","403","xss"],
    required_context:["authorized-scope","xss-candidate"],
    dependencies:[],
    risk_level:"medium",
    scope_requirements:["authorized-scope"],
    validation_requirements:["request-response-evidence","browser-validation"],
    confidence_threshold:0.6,
    maximum_parallel_tasks:1,
    source_path:".cyberstrike/skill/WEB/waf-xss-bypass/SKILL.md",
    agent_roles:["primary-hunter"],
  },
  {
    name:"attack-rate-limit-bypass",
    category:"web-application",
    description:"Rate-limit bypass validation for authorized web targets.",
    triggers:["rate-limit","429","throttle","blocked","bypass"],
    required_context:["authorized-scope","rate-limit-signal"],
    dependencies:[],
    risk_level:"medium",
    scope_requirements:["authorized-scope"],
    validation_requirements:["request-response-evidence"],
    confidence_threshold:0.6,
    maximum_parallel_tasks:1,
    source_path:".cyberstrike/skill/attack-rate-limit-bypass/SKILL.md",
    agent_roles:["primary-hunter"],
  },
  {
    name:"attack-idor-automation",
    category:"web-application",
    description:"Object-level authorization and IDOR validation.",
    triggers:["idor","authorization","access-control","object-identifier","object_identifier"],
    required_context:["authorized-scope","account-context"],
    dependencies:[],
    risk_level:"medium",
    scope_requirements:["authorized-scope"],
    validation_requirements:["cross-account-evidence","request-response-evidence"],
    confidence_threshold:0.7,
    maximum_parallel_tasks:2,
    source_path:".cyberstrike/skill/attack-idor-automation/SKILL.md",
    agent_roles:["primary-hunter","correlator"],
  },
]

function indexMetadata(entry:SkillIndexEntry):SkillMetadata{
  const triggers=[
    entry.name,
    entry.category??"",
    ...(entry.tags??[]),
    ...(entry.tech_stack??[]),
    ...(entry.cwe_ids??[]),
    ...(entry.category?.toLowerCase().includes("api-testing") ? ["api_method_mismatch"] : []),
  ].filter(Boolean)
  return {
    name:entry.name,
    category:entry.category??"general",
    description:entry.description??entry.name,
    triggers,
    required_context:["authorized-scope"],
    dependencies:[],
    risk_level:"medium",
    scope_requirements:["authorized-scope"],
    validation_requirements:["evidence"],
    confidence_threshold:0.5,
    maximum_parallel_tasks:1,
    source_path:entry.files?.[0] ? ".cyberstrike/skill/"+entry.name+"/"+entry.files[0] : undefined,
  }
}

const CONFIG_SKILL_ALIASES:Record<string,string>={
  "waf-awareness":"waf-xss-bypass",
  "javascript-intelligence":"analyze-js",
  "javascript_intelligence":"analyze-js",
}
  
async function collectSkillFiles(root:string):Promise<string[]>{
  const output:string[]=[]
  async function visit(dir:string):Promise<void>{
    let entries
    try{ entries=await readdir(dir,{withFileTypes:true}) }catch{ return }
    for(const entry of entries){
      const full=path.join(dir,entry.name)
      if(entry.isDirectory()){ await visit(full); continue }
      if(entry.isFile() && entry.name==="SKILL.md") output.push(full)
    }
  }
  await visit(root)
  return output
}

function parseFrontmatter(text:string):Record<string,string>{
  const match=text.match(/^---\s*\n([\s\S]*?)\n---/m)
  if(!match)return {}
  const values:Record<string,string>={}
  for(const line of match[1].split(/\r?\n/)){
    const field=line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/)
    if(!field)continue
    values[field[1]]=field[2].trim().replace(/^["']|["']$/g,"")
  }
  return values
}

function parseListValue(value:string|undefined):string[]{
  if(!value)return []
  const raw=value.trim()
  const inner=raw.startsWith("[")&&raw.endsWith("]") ? raw.slice(1,-1) : raw
  return inner.split(",").map(item=>item.trim().replace(/^["']|["']$/g,"")).filter(Boolean)
}

function inferAgentRoles(name:string,category:string):("primary-hunter"|"validator"|"correlator"|"reviewer")[]{
  const value=(name+" "+category).toLowerCase()
  if(/report|review/.test(value)) return ["reviewer"]
  if(/validat|verif|confirm|evidence/.test(value)) return ["validator"]
  if(/js|javascript|proxy|correlat|parser|analy/.test(value)) return ["correlator"]
  return ["primary-hunter"]
}

function inferExternalTriggers(name:string,category:string,text:string):string[]{
  const haystack=(name+" "+category+" "+text.slice(0,8000)).toLowerCase()
  const triggers=new Set<string>([name,category].filter(Boolean))
  const rules:Array<[RegExp,string|string[]]>=[
    [/\b(?:idor|bola|broken[- ]object|object[- ]authorization)\b/,"object_identifier_detected"],
    [/\b(?:auth|authentication|login|mfa|oauth|saml|session)\b/,"authenticated_endpoint"],
    [/\b(?:waf|firewall|403|406|429|bypass)\b/,["waf_signal_detected","access_control_blocked"]],
    [/\b(?:graphql)\b/,"graphql_detected"],
    [/\b(?:websocket)\b/,"websocket_detected"],
    [/\b(?:jwt)\b/,"jwt_detected"],
    [/\b(?:javascript|dom|xss|prototype[- ]pollution|source[- ]map)\b/,["javascript_asset","javascript_function_request_correlation"]],
    [/\b(?:api|rest|grpc|json[- ]rpc)\b/,["endpoint_discovery","api_method_mismatch"]],
    [/\b(?:recon|enumeration|subdomain|vhost|osint)\b/,"endpoint_discovery"],
    [/\b(?:upload|file)\b/,"file_upload_detected"],
    [/\b(?:redirect)\b/,"redirect_parameter_detected"],
    [/\b(?:source[- ]leak|secret)\b/,"source_map_detected"],
  ]
  for(const [pattern,values] of rules){
    if(!pattern.test(haystack))continue
    if(Array.isArray(values)) for(const value of values) triggers.add(value)
    else triggers.add(values)
  }
  return [...triggers].filter(Boolean)
}

async function loadExternalSkills(root:string):Promise<SkillMetadata[]>{
  const configured=(process.env.HUNT_EXTERNAL_SKILL_ROOTS??"").split(path.delimiter).map(x=>x.trim()).filter(Boolean)
  const home=process.env.HOME ?? ""
  const defaults=[
    path.resolve(home,"bug-bounty-agent","skills"),
    path.resolve(home,".agents","skills"),
    path.resolve(root,"skills"),
  ].filter(value=>value && !configured.includes(value))
  const roots=[...configured,...defaults]
  const files=[...new Set((await Promise.all(roots.map(collectSkillFiles))).flat())]
  const skills:SkillMetadata[]=[]
  for(const file of files){
    let textValue:string
    try{ textValue=await readFile(file,"utf8") }catch{ continue }
    const rel=file.split(path.sep)
    const skillName=rel[rel.length-2] || path.basename(file,".md")
    const frontmatter=parseFrontmatter(textValue)
    const category=rel.includes("redteam") ? "redteam" : rel.includes("recon") ? "recon" : rel.includes("auth") ? "authentication" : rel.includes("infra") ? "infrastructure" : rel.includes("skills") ? "web-application" : "external"
    const name=frontmatter.name || skillName
    const parsedRoles=parseListValue(frontmatter.agent_roles).filter((value):value is "primary-hunter"|"validator"|"correlator"|"reviewer" =>
      ["primary-hunter","validator","correlator","reviewer"].includes(value),
    )
    const configuredAgent=frontmatter.agent?.trim() || undefined
    const parsedRisk=frontmatter.risk_level?.trim()
    const risk_level:SkillMetadata["risk_level"]=parsedRisk==="low"||parsedRisk==="high" ? parsedRisk : "medium"
    const confidence_threshold=frontmatter.confidence_threshold ? Number(frontmatter.confidence_threshold) : 0.5
    const maximum_parallel_tasks=frontmatter.maximum_parallel_tasks ? Math.max(1,Number(frontmatter.maximum_parallel_tasks)) : 1
    skills.push({
      name,
      category,
      description:frontmatter.description || name,
      triggers:inferExternalTriggers(name,category,textValue),
      required_signals:parseListValue(frontmatter.required_signals),
      required_context:parseListValue(frontmatter.required_context).length ? parseListValue(frontmatter.required_context) : ["authorized-scope"],
      dependencies:parseListValue(frontmatter.dependencies),
      risk_level,
      scope_requirements:parseListValue(frontmatter.scope_requirements).length ? parseListValue(frontmatter.scope_requirements) : ["authorized-scope"],
      validation_requirements:parseListValue(frontmatter.validation_requirements).length ? parseListValue(frontmatter.validation_requirements) : ["evidence"],
      confidence_threshold:Number.isFinite(confidence_threshold) ? Math.max(0,Math.min(1,confidence_threshold)) : 0.5,
      maximum_parallel_tasks:Number.isFinite(maximum_parallel_tasks) ? maximum_parallel_tasks : 1,
      source_path:file,
      agent_roles:parsedRoles.length ? parsedRoles : inferAgentRoles(name, category),
      agent:configuredAgent,
    })
  }
  return skills
}
async function loadConfiguredSignalMappings(root:string):Promise<Map<string,string[]>>{
  const file=path.join(root,"config","skills.yaml")
  if(!await Bun.file(file).exists())return new Map()
  const text=await Bun.file(file).text()
  const mappings=new Map<string,string[]>()
  let section=""
  let signal=""
  for(const line of text.split(/\r?\n/)){
    if(/^signals:\s*$/.test(line)){section="signals";signal="";continue}
    if(/^skills:\s*$/.test(line)){section="skills";signal="";continue}
    if(section!=="signals")continue
    const header=line.match(/^  ([A-Za-z0-9_-]+):\s*$/)
    if(header){signal=header[1];continue}
    if(!signal)continue
    const match=line.match(/^\s{4}skills:\s*\[([^\]]*)\]/)
    if(!match)continue
    const names=match[1].split(",").map(value=>value.trim().replace(/^["']|["']$/g,"")).filter(Boolean)
    for(const name of names){
      const canonical=CONFIG_SKILL_ALIASES[name]??name
      const existing=mappings.get(canonical)??[]
      if(!existing.includes(signal))existing.push(signal)
      mappings.set(canonical,existing)
    }
  }
  return mappings
}

async function loadConfiguredRequiredSignals(root:string):Promise<Map<string,string[]>>{
  const file=path.join(root,"config","skills.yaml")
  if(!await Bun.file(file).exists())return new Map()
  const text=await Bun.file(file).text()
  const result=new Map<string,string[]>()
  let section=""
  let skill=""
  for(const line of text.split(/\r?\n/)){
    if(/^skills:\s*$/.test(line)){section="skills";skill="";continue}
    if(section!=="skills")continue
    const header=line.match(/^  ([A-Za-z0-9_-]+):\s*$/)
    if(header){skill=header[1];continue}
    const match=line.match(/^\s{4}required_signals:\s*\[([^\]]*)\]/)
    if(match && skill){
      result.set(skill,match[1].split(",").map(value=>value.trim().replace(/^["']|["']$/g,"")).filter(Boolean))
    }
  }
  return result
}

async function loadConfiguredSkillMetadata(root:string):Promise<Map<string,Partial<SkillMetadata>>>{
  const file=path.join(root,"config","skills.yaml")
  if(!await Bun.file(file).exists())return new Map()
  const result=new Map<string,Partial<SkillMetadata>>()
  let section=""
  let skill=""
  for(const line of (await Bun.file(file).text()).split(/\r?\n/)){
    if(/^skills:\s*$/.test(line)){section="skills";skill="";continue}
    if(section!=="skills")continue
    const header=line.match(/^  ([A-Za-z0-9_-]+):\s*$/)
    if(header){skill=header[1];result.set(skill,{});continue}
    const meta=result.get(skill); if(!meta)continue
    let m=line.match(/^\s{4}confidence_threshold:\s*([0-9.]+)/); if(m)meta.confidence_threshold=Number(m[1])
    m=line.match(/^\s{4}agent:\s*(.+)$/); if(m)meta.agent=m[1].trim().replace(/^['"]|['"]$/g,"")
    m=line.match(/^\s{4}maximum_parallel_tasks:\s*(\d+)/); if(m)meta.maximum_parallel_tasks=Number(m[1])
    m=line.match(/^\s{4}(?:dependencies|optional_signals|required_context|validation_requirements|scope_requirements|agent_roles):\s*\[([^\]]*)\]/)
    if(m){const key=line.trim().split(":")[0] as keyof SkillMetadata; (meta as any)[key]=m[1].split(",").map(v=>v.trim().replace(/^['\"]|['\"]$/g,"")).filter(Boolean)}
  }
  return result
}

async function resolveIndexedSkillSource(root:string,entry:SkillIndexEntry):Promise<string|undefined>{
  const skillRoots=[
    path.join(root,".cyberstrike","skill"),
    path.resolve(root,"..",".cyberstrike","skill"),
    path.resolve(process.cwd(),".cyberstrike","skill"),
  ]
  const candidates=new Set((await Promise.all(skillRoots.map(collectSkillFiles))).flat())
  const suffixes=entry.files??["SKILL.md"]
  for(const file of candidates){
    const basename=path.basename(path.dirname(file))
    if(basename===entry.name && suffixes.some(s=>file.endsWith(path.sep+s))) return file
  }
  return undefined
}

export async function loadSkillRegistry(root:string):Promise<SkillRegistry>{
  const file=path.join(root,".cyberstrike","skill","index.json")
  const index=await readJson<SkillIndex|null>(file,null)
  const merged=new Map<string,SkillMetadata>()

  for(const entry of index?.skills??[]){
    if(!entry.name)continue
    const metadata=indexMetadata(entry)
    metadata.source_path=await resolveIndexedSkillSource(root,entry) ?? metadata.source_path
    merged.set(entry.name,metadata)
  }
  for(const skill of WEB_SKILLS)merged.set(skill.name,skill)

  for(const skill of await loadExternalSkills(root)){
    const existing=merged.get(skill.name)
    if(!existing){
      merged.set(skill.name,skill)
      continue
    }
    existing.triggers=[...new Set([...existing.triggers,...skill.triggers])]
    existing.required_signals=[...new Set([...(existing.required_signals??[]),...(skill.required_signals??[])])]
    existing.required_context=[...new Set([...existing.required_context,...skill.required_context])]
    existing.dependencies=[...new Set([...existing.dependencies,...skill.dependencies])]
    existing.scope_requirements=[...new Set([...existing.scope_requirements,...skill.scope_requirements])]
    existing.validation_requirements=[...new Set([...existing.validation_requirements,...skill.validation_requirements])]
    existing.agent_roles=existing.agent_roles ?? skill.agent_roles
    existing.agent=existing.agent ?? skill.agent
    existing.source_path=existing.source_path ?? skill.source_path
    merged.set(skill.name,existing)
  }

  const configured=await loadConfiguredSignalMappings(root)
  const configuredRequired=await loadConfiguredRequiredSignals(root)
  const configuredMetadata=await loadConfiguredSkillMetadata(root)
  for(const [skillName,signals] of configured){
    const skill=merged.get(skillName)
    if(!skill)continue
    skill.triggers=[...new Set([...skill.triggers,...signals])]
    merged.set(skillName,skill)
  }

  for(const [skillName,metadata] of configuredMetadata){
    const skill=merged.get(skillName)
    if(!skill)continue
    Object.assign(skill,metadata)
    merged.set(skillName,skill)
  }

  for(const [skillName,signals] of configuredRequired){
    const skill=merged.get(skillName)
    if(!skill)continue
    skill.required_signals=[...new Set(signals)]
    merged.set(skillName,skill)
  }

  return new SkillRegistry([...merged.values()])
}
