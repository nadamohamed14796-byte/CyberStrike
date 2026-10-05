export type SkillMetadata={
  name:string;
  category:string;
  description:string;
  triggers:string[];
  required_context:string[];
  dependencies:string[];
  risk_level:"low"|"medium"|"high";
  scope_requirements:string[];
  validation_requirements:string[];
  confidence_threshold:number;
  maximum_parallel_tasks:number;
  source_path?:string
}

const canonicalTrigger=(value:string):string =>
  value.trim().toLowerCase().replace(/[_\s]+/g,"-")

const SKILL_ALIASES:Record<string,string>={
  "waf-awareness":"waf-xss-bypass",
  "waf-aware":"waf-xss-bypass",
  "javascript_intelligence":"analyze-js",
  "javascript-intelligence":"analyze-js",
  "idor":"attack-idor-automation",
  "rate-limit":"attack-rate-limit-bypass",
}

export class SkillRegistry{
  constructor(private skills:SkillMetadata[]){}

  get(name:string){
    const canonical=SKILL_ALIASES[name]??name
    return this.skills.find(x=>x.name===canonical)
  }

  resolve(names:string[]){
    const out=new Map<string,SkillMetadata>()
    const visit=(name:string)=>{
      const canonical=SKILL_ALIASES[name]??name
      if(out.has(canonical))return
      const skill=this.get(canonical)
      if(!skill)return
      for(const dep of skill.dependencies)visit(dep)
      out.set(canonical,skill)
    }
    for(const name of names)visit(name)
    return [...out.values()]
  }

  select(signalNames:string[],confidence:number){
    const signals=new Set(signalNames.map(canonicalTrigger))
    return this.skills
      .filter(x =>
        confidence>=x.confidence_threshold &&
        x.triggers.some(t=>signals.has(canonicalTrigger(t)))
      )
      .sort((a,b)=>
        (b.maximum_parallel_tasks-a.maximum_parallel_tasks) ||
        a.name.localeCompare(b.name)
      )
  }

  selectForTask(primarySkill:string,signalNames:string[],confidence:number){
    const related=this.select(signalNames,confidence)
    const names=[primarySkill,...related.map(x=>x.name)]
    return this.resolve(names)
  }
}
