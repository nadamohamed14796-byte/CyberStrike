export type SkillMetadata={
  name:string;
  category:string;
  description:string;
  triggers:string[];
  required_signals?:string[];
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
  constructor(private skills:SkillMetadata[]){
    const merged=new Map<string,SkillMetadata>()
    for(const skill of skills){
      const existing=merged.get(skill.name)
      if(!existing){ merged.set(skill.name,{...skill,dependencies:[...new Set(skill.dependencies)]}); continue }
      merged.set(skill.name,{...existing,...skill,triggers:[...new Set([...existing.triggers,...skill.triggers])],required_context:[...new Set([...existing.required_context,...skill.required_context])],dependencies:[...new Set([...existing.dependencies,...skill.dependencies])],scope_requirements:[...new Set([...existing.scope_requirements,...skill.scope_requirements])],validation_requirements:[...new Set([...existing.validation_requirements,...skill.validation_requirements])],required_signals:[...new Set([...(existing.required_signals??[]),...(skill.required_signals??[])])],source_path:existing.source_path ?? skill.source_path})
    }
    this.skills=[...merged.values()].sort((a,b)=>a.name.localeCompare(b.name))
  }

  list(){return [...this.skills]}

  get(name:string){
    const canonical=SKILL_ALIASES[name]??name
    return this.skills.find(x=>x.name===canonical)
  }

  resolve(names:string[]){
    const out=new Map<string,SkillMetadata>()
    const visiting=new Set<string>()
    const visit=(name:string)=>{
      const canonical=SKILL_ALIASES[name]??name
      if(visiting.has(canonical))throw new Error(`cyclic skill dependency: ${[...visiting,canonical].join(" -> ")}`)
      if(out.has(canonical))return
      const skill=this.get(canonical)
      if(!skill)return
      visiting.add(canonical)
      for(const dep of skill.dependencies)visit(dep)
      visiting.delete(canonical)
      out.set(canonical,skill)
    }
    for(const name of names)visit(name)
    return [...out.values()]
  }

  validateDependencies(){
    const errors:string[]=[]
    for(const skill of this.skills){
      for(const dependency of skill.dependencies)if(!this.get(dependency))errors.push(`${skill.name} -> missing dependency ${dependency}`)
      try{this.resolve([skill.name])}catch(error){errors.push(String(error instanceof Error?error.message:error))}
    }
    return [...new Set(errors)]
  }

  select(signalNames:string[],confidence:number){
    const signals=new Set(signalNames.map(canonicalTrigger))
    return this.skills
      .filter(x =>
        confidence>=x.confidence_threshold &&
        x.triggers.some(t=>signals.has(canonicalTrigger(t))) &&
        (x.required_signals?.length
          ? x.required_signals.every(signal => signals.has(canonicalTrigger(signal)))
          : true)
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
