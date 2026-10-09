export type Attempt={attempt_id:string;hypothesis_id:string;strategy:string;variant:string;reason:string;result:"EXECUTED"|"NOT_EXECUTED"|"FAILED_TO_EXECUTE"|"INCONCLUSIVE"|"VERIFIED"|"FALSE_POSITIVE"|"BLOCKED";evidence_refs:string[];timestamp:string;account_context?:string}
export const STRATEGIES=["parameter-variation","encoding-variation","http-method","content-type","request-shape","authorization-context","identifier-variation","path-variation","header-behavior","application-workflow","framework-parser","alternate-legitimate-flow"] as const
export type ValidationGateInput={in_scope:boolean;real:boolean;reproducible:boolean;crosses_security_boundary:boolean;attacker_controlled:boolean;measurable_impact:boolean;security_relevant:boolean;authorization_boundary:boolean;demonstrated:boolean;duplicate_or_expected:boolean}
export function tenQuestionGate(input:ValidationGateInput){if(!input.in_scope)return{status:"OUT_OF_SCOPE",passed:false};if(input.duplicate_or_expected)return{status:"FALSE_POSITIVE",passed:false};if(Object.entries(input).filter(([key])=>key!=="duplicate_or_expected").every(([,value])=>value===true))return{status:"VERIFIED",passed:true};return{status:"INCONCLUSIVE",passed:false}}
export class AttemptEngine{
  private attempts:Attempt[]=[]
  constructor(private budget=20){}
  record(attempt:Omit<Attempt,"timestamp">){const item={...attempt,timestamp:new Date().toISOString()};this.attempts.push(item);return item}
  next(hypothesis_id:string,used:Set<string>){const a=this.attempts.filter(x=>x.hypothesis_id===hypothesis_id);if(a.some(x=>["VERIFIED","FALSE_POSITIVE","BLOCKED"].includes(x.result)))return null;if(a.length>=this.budget)return null;return STRATEGIES.find(x=>!used.has(x))??null}
  shouldStop(hypothesis_id:string){const a=this.attempts.filter(x=>x.hypothesis_id===hypothesis_id);if(a.some(x=>x.result==="VERIFIED"))return"VERIFIED";if(a.some(x=>x.result==="FALSE_POSITIVE"))return"FALSE_POSITIVE";if(a.some(x=>x.result==="BLOCKED"))return"BLOCKED";if(a.length>=this.budget)return"INCONCLUSIVE";return null}
  list(){return[...this.attempts]}
}
export function responseFingerprint(status:number,headers:Record<string,string>,body:string){const relevant=Object.entries(headers).filter(([k])=>!/date|set-cookie/i.test(k)).sort();return Bun.hash(JSON.stringify({status,headers:relevant,body})).toString(16)}
