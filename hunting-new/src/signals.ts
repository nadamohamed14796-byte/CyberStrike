export type Signal={signal:string;source:string;confidence:number;target:string;timestamp:string;endpoint?:string;function_id?:string;metadata?:Record<string,unknown>}
export type SkillRule={name:string;confidence_threshold:number;required_signals:string[];optional_signals?:string[];dependencies?:string[];priority?:number;maximum_parallel_tasks?:number}
export class SignalEngine{
  private signals:Signal[]=[]
  emit(signal:Omit<Signal,"timestamp">){const item={...signal,confidence:Math.max(0,Math.min(1,signal.confidence)),timestamp:new Date().toISOString()};this.signals.push(item);return item}
  list(){return [...this.signals]}
  selectSkills(rules:SkillRule[]){const names=new Set(this.signals.map(x=>x.signal));return rules.filter(r=>r.required_signals.every(x=>names.has(x))).filter(r=>this.signals.some(x=>r.required_signals.includes(x)&&x.confidence>=r.confidence_threshold)).sort((a,b)=>(b.priority??0)-(a.priority??0))}
}