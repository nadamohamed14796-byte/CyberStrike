export type SkillMetadata={name:string;category:string;description:string;triggers:string[];required_context:string[];dependencies:string[];risk_level:"low"|"medium"|"high";scope_requirements:string[];validation_requirements:string[];confidence_threshold:number;maximum_parallel_tasks:number}
export class SkillRegistry{
  constructor(private skills:SkillMetadata[]){}
  get(name:string){return this.skills.find(x=>x.name===name)}
  resolve(names:string[]){const out=new Map<string,SkillMetadata>();const visit=(name:string)=>{if(out.has(name))return;const skill=this.get(name);if(!skill)return;for(const dep of skill.dependencies)visit(dep);out.set(name,skill)};for(const name of names)visit(name);return [...out.values()]}
  select(signalNames:string[],confidence:number){return this.skills.filter(x=>confidence>=x.confidence_threshold&&x.triggers.some(t=>signalNames.includes(t))).sort((a,b)=>b.maximum_parallel_tasks-a.maximum_parallel_tasks)}
}
