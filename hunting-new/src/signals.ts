export type Signal={signal:string;source:string;confidence:number;target:string;timestamp:string;endpoint?:string;function_id?:string;metadata?:Record<string,unknown>}
export type SkillRule={name:string;confidence_threshold:number;required_signals:string[];optional_signals?:string[];dependencies?:string[];priority?:number;maximum_parallel_tasks?:number}
export type SkillSelection=SkillRule & { matchedSignals:string[]; score:number }

export class SignalEngine{
  private signals:Signal[]=[]
  emit(signal:Omit<Signal,"timestamp">){
    const item={...signal,confidence:Math.max(0,Math.min(1,signal.confidence)),timestamp:new Date().toISOString()}
    this.signals.push(item)
    return item
  }
  list(){return [...this.signals]}
  forTarget(target:string){return this.signals.filter(x=>x.target===target)}
  selectSkills(rules:SkillRule[], target?:string):SkillSelection[]{
    const signals=target?this.forTarget(target):this.signals
    return rules
      .map(r=>{
        const matchedSignals=[...new Set(signals.filter(s=>r.required_signals.includes(s.signal)&&s.confidence>=r.confidence_threshold).map(s=>s.signal))]
        const requiredSatisfied=r.required_signals.every(x=>signals.some(s=>s.signal===x))
        const score=matchedSignals.length/Math.max(1,r.required_signals.length)
        return { ...r, matchedSignals, score, requiredSatisfied }
      })
      .filter(x=>x.requiredSatisfied && x.matchedSignals.length>0)
      .sort((a,b)=>(b.score-a.score)||((b.priority??0)-(a.priority??0)))
      .map(({requiredSatisfied:_,...skill})=>skill)
  }
}
