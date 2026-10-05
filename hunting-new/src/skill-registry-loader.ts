import path from "node:path"
import { readJson } from "./store"
import { SkillRegistry, type SkillMetadata } from "./skill-registry"

interface SkillIndexEntry {
  name:string
  description?:string
  category?:string
  tags?:string[]
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
  const triggers=[entry.name,...(entry.tags??[])]
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

export async function loadSkillRegistry(root:string):Promise<SkillRegistry>{
  const file=path.join(root,".cyberstrike","skill","index.json")
  const index=await readJson<SkillIndex|null>(file,null)
  const merged=new Map<string,SkillMetadata>()

  for(const entry of index?.skills??[]){
    if(entry.name)merged.set(entry.name,indexMetadata(entry))
  }
  for(const skill of WEB_SKILLS)merged.set(skill.name,skill)

  return new SkillRegistry([...merged.values()])
}
