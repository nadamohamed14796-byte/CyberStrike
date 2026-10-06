import path from "node:path"
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
  },
]

function indexMetadata(entry:SkillIndexEntry):SkillMetadata{
  const triggers=[
    entry.name,
    entry.category??"",
    ...(entry.tags??[]),
    ...(entry.tech_stack??[]),
    ...(entry.cwe_ids??[]),
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

export async function loadSkillRegistry(root:string):Promise<SkillRegistry>{
  const file=path.join(root,".cyberstrike","skill","index.json")
  const index=await readJson<SkillIndex|null>(file,null)
  const merged=new Map<string,SkillMetadata>()

  for(const entry of index?.skills??[]){
    if(entry.name)merged.set(entry.name,indexMetadata(entry))
  }
  for(const skill of WEB_SKILLS)merged.set(skill.name,skill)

  const configured=await loadConfiguredSignalMappings(root)
  for(const [skillName,signals] of configured){
    const skill=merged.get(skillName)
    if(!skill)continue
    skill.triggers=[...new Set([...skill.triggers,...signals])]
    merged.set(skillName,skill)
  }

  return new SkillRegistry([...merged.values()])
}
