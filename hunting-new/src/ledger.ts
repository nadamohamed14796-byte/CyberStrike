import path from "node:path"
import { readJson, writeJson, ensureDir, targetDir, withTargetMutationLock } from "./store"
export type LedgerState = "DISCOVERED"|"QUEUED"|"IN_PROGRESS"|"TESTED"|"VALIDATED"|"BLOCKED"|"SKIPPED_WITH_REASON"|"NOT_APPLICABLE"
export type LedgerItem = { item_id:string; type:string; status:LedgerState; priority?:"P1"|"P2"|"P3"|"P4"; assigned_task?:string; reason?:string; last_tested?:string; evidence_refs?:string[]; next_action?:string|null; metadata?:Record<string,unknown> }
export class Ledger {
  constructor(private root:string, private target:string, private name:string) {}
  private file(){ return path.join(targetDir(this.root,this.target),"ledgers",this.name+".json") }
  async list(){ return readJson<LedgerItem[]>(this.file(),[]) }
  async upsert(item:LedgerItem){
    return withTargetMutationLock(this.root,this.target,async()=>{
      await ensureDir(path.dirname(this.file()))
      const items=await this.list()
      const next=items.some(x=>x.item_id===item.item_id)?items.map(x=>x.item_id===item.item_id?{...x,...item}:x):[...items,item]
      await writeJson(this.file(),next)
      return item
    })
  }
  async coverage(){
    const items=await this.list()
    const count=(s:LedgerState)=>items.filter(x=>x.status===s).length
    return {total:items.length,tested:count("TESTED"),validated:count("VALIDATED"),blocked:count("BLOCKED"),skipped:count("SKIPPED_WITH_REASON"),not_applicable:count("NOT_APPLICABLE"),pending:items.filter(x=>["DISCOVERED","QUEUED","IN_PROGRESS"].includes(x.status)).length}
  }
}
export function ledgers(root:string,target:string){ return Object.fromEntries(["js","endpoint","ui","function","parameter","request","hypothesis","finding"].map(name=>[name,new Ledger(root,target,name)])) as Record<string,Ledger> }
export async function coverageGate(root:string,target:string){
  const result=await Promise.all(Object.entries(ledgers(root,target)).map(async([name,ledger])=>[name,await ledger.coverage()] as const))
  const pending=result.filter(([,c])=>c.pending>0)
  const total=result.reduce((sum,[,coverage])=>sum+coverage.total,0)
  return {complete:total>0 && pending.length===0,ledgers:Object.fromEntries(result),pending:pending.map(([name,c])=>({name,count:c.pending}))}
}

export function stableLedgerId(type:string,value:string):string {
  const raw=value.trim().toLowerCase()
  const normalized=type==="endpoint" && raw.includes("|")
    ? raw.slice(raw.indexOf("|")+1)
    : raw
  return type+"_"+Bun.hash(normalized).toString(16)
}

export async function markDiscovered(
  root:string,
  target:string,
  items:Array<{type:string;id:string;metadata?:Record<string,unknown>}>,
):Promise<void>{
  const registry=ledgers(root,target)
  for(const item of items){
    const ledger=(registry as Record<string,Ledger>)[item.type]
    if(!ledger) continue
    const existing=(await ledger.list()).find(x=>x.item_id===item.id)
    if(existing){
      if(existing.status==="DISCOVERED") continue
      continue
    }
    await ledger.upsert({
      item_id:item.id,
      type:item.type,
      status:"DISCOVERED",
      metadata:item.metadata,
    })
  }
}

export async function markTested(
  root:string,
  target:string,
  items:Array<{type:string;id:string;evidence_refs?:string[];reason?:string}>,
):Promise<void>{
  const registry=ledgers(root,target)
  for(const item of items){
    const ledger=(registry as Record<string,Ledger>)[item.type]
    if(!ledger) continue
    const current=(await ledger.list()).find(x=>x.item_id===item.id)
    await ledger.upsert({
      item_id:item.id,
      type:item.type,
      status:current?.status==="VALIDATED" ? "VALIDATED" : "TESTED",
      evidence_refs:[...(current?.evidence_refs??[]),...(item.evidence_refs??[])],
      reason:item.reason??current?.reason,
    })
  }
}

export async function markValidated(
  root:string,
  target:string,
  items:Array<{type:string;id:string;evidence_refs?:string[];reason?:string}>,
):Promise<void>{
  const registry=ledgers(root,target)
  for(const item of items){
    const ledger=(registry as Record<string,Ledger>)[item.type]
    if(!ledger) continue
    const current=(await ledger.list()).find(x=>x.item_id===item.id)
    await ledger.upsert({
      item_id:item.id,
      type:item.type,
      status:"VALIDATED",
      evidence_refs:[...(current?.evidence_refs??[]),...(item.evidence_refs??[])],
      reason:item.reason??current?.reason,
    })
  }
}
