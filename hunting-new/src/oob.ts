import path from "node:path"
import { ensureDir, readJson, targetDir, writeJson } from "./store"

export type OobState="generated"|"observed"|"correlated"|"confirmed"

export interface OobRecord{
  id:string
  callbackId:string
  target:string
  hypothesisId:string
  attemptId?:string
  state:OobState
  generatedAt:string
  observedAt?:string
  source?:string
  evidenceIds:string[]
  details?:string
}

export interface OobStateStore{
  target:string
  records:OobRecord[]
  updatedAt:string
}

function file(root:string,target:string){
  return path.join(targetDir(root,target),"intelligence","oob.json")
}

export async function loadOob(root:string,target:string):Promise<OobStateStore>{
  return (await readJson<OobStateStore|null>(file(root,target),null)) ?? {
    target,
    records:[],
    updatedAt:new Date().toISOString(),
  }
}

export async function saveOob(root:string,state:OobStateStore):Promise<OobStateStore>{
  const dir=path.dirname(file(root,state.target))
  await ensureDir(dir)
  const next={...state,updatedAt:new Date().toISOString()}
  await writeJson(file(root,state.target),next)
  return next
}

export async function upsertOob(root:string,target:string,record:OobRecord):Promise<OobStateStore>{
  const state=await loadOob(root,target)
  const index=state.records.findIndex(item=>item.id===record.id || item.callbackId===record.callbackId)
  if(index===-1)state.records.push(record)
  else state.records[index]={
    ...state.records[index],
    ...record,
    evidenceIds:[...new Set([...(state.records[index].evidenceIds??[]),...(record.evidenceIds??[])])],
  }
  return saveOob(root,state)
}

export async function recordOobObservation(
  root:string,
  target:string,
  callbackId:string,
  observedAt= new Date().toISOString(),
  evidenceIds:string[]=[],
):Promise<OobRecord|undefined>{
  const state=await loadOob(root,target)
  const index=state.records.findIndex(item=>item.callbackId===callbackId)
  if(index===-1)return undefined
  const record={
    ...state.records[index],
    state:"observed" as const,
    observedAt,
    evidenceIds:[...new Set([...(state.records[index].evidenceIds??[]),...evidenceIds])],
  }
  state.records[index]=record
  await saveOob(root,state)
  return record
}

export async function correlateOob(
  root:string,
  target:string,
  callbackId:string,
  evidenceIds:string[],
):Promise<OobRecord|undefined>{
  const state=await loadOob(root,target)
  const index=state.records.findIndex(item=>item.callbackId===callbackId)
  if(index===-1)return undefined
  const record={
    ...state.records[index],
    state:"correlated" as const,
    evidenceIds:[...new Set([...(state.records[index].evidenceIds??[]),...evidenceIds])],
  }
  state.records[index]=record
  await saveOob(root,state)
  return record
}

export async function confirmOob(
  root:string,
  target:string,
  callbackId:string,
  evidenceIds:string[],
):Promise<OobRecord|undefined>{
  const state=await loadOob(root,target)
  const index=state.records.findIndex(item=>item.callbackId===callbackId)
  if(index===-1)return undefined
  const merged=[...new Set([...(state.records[index].evidenceIds??[]),...evidenceIds])]
  if(!merged.length)return state.records[index]
  const record={...state.records[index],state:"confirmed" as const,evidenceIds:merged}
  state.records[index]=record
  await saveOob(root,state)
  return record
}
