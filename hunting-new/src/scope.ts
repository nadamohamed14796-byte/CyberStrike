import path from "node:path"

export type ScopeRule={value:string;path?:string;protocols?:string[];ports?:number[];exclude?:boolean}
export type ScopeDecision={allowed:boolean;normalized:string;reason:string}

interface ParsedTarget{
  protocol:string
  host:string
  port:number
  path:string
  normalized:string
}

function parseTarget(input:string):ParsedTarget|null{
  const value=input.trim()
  if(!value)return null
  try{
    const url=new URL(value.includes("://")?value:"https://"+value)
    const protocol=url.protocol.replace(":","").toLowerCase()
    const host=url.hostname.toLowerCase().replace(/\.$/,"")
    const port=url.port ? Number(url.port) : protocol==="http" ? 80 : 443
    const path=url.pathname.replace(/\/$/,"") || "/"
    return {protocol,host,port,path,normalized:host+((path && path!=="/")?path:"")}
  }catch{
    const host=value
      .toLowerCase()
      .replace(/^https?:\/\//,"")
      .split("/")[0]
      .replace(/\.$/,"")
    if(!host)return null
    return {protocol:"https",host,port:443,path:"/",normalized:host}
  }
}

function globMatch(value:string,pattern:string){
  const parts=pattern.toLowerCase().split("*")
  if(parts.length===1)return value.toLowerCase()===pattern.toLowerCase()
  let pos=0
  for(const part of parts){
    if(!part)continue
    const at=value.toLowerCase().indexOf(part,pos)
    if(at<0)return false
    pos=at+part.length
  }
  return pattern.startsWith("*")||value.toLowerCase().startsWith(parts[0])
}

function hostPattern(rule:string):string{
  return parseTarget(rule)?.host ?? rule.trim().toLowerCase().split("/")[0]
}

function hostMatch(host:string,rule:string){
  const r=hostPattern(rule)
  if(!r)return false
  if(r.startsWith("*."))return host===r.slice(2)||host.endsWith("."+r.slice(2))
  if(r.endsWith(".*"))return host.startsWith(r.slice(0,-2)+".")||host===r.slice(0,-2)
  return globMatch(host,r)
}

function ruleProtocolMatches(target:ParsedTarget,rule:ScopeRule):boolean{
  if(!rule.protocols?.length)return true
  return rule.protocols.some(value=>value.trim().toLowerCase().replace(/:$/,"")===target.protocol)
}

function rulePortMatches(target:ParsedTarget,rule:ScopeRule):boolean{
  if(!rule.ports?.length)return true
  return rule.ports.includes(target.port)
}

function rulePathMatches(target:ParsedTarget,rule:ScopeRule):boolean{
  if(!rule.path)return true
  return globMatch(target.path||"/",rule.path)
}

function scalar(value:string):string{
  const trimmed=value.trim()
  if((trimmed.startsWith('"')&&trimmed.endsWith('"'))||(trimmed.startsWith("'")&&trimmed.endsWith("'"))){
    return trimmed.slice(1,-1)
  }
  return trimmed
}

function scalarList(value:string):string[]{
  const trimmed=value.trim()
  if(!trimmed)return []
  const inner=trimmed.startsWith("[")&&trimmed.endsWith("]")?trimmed.slice(1,-1):trimmed
  return inner.split(",").map(item=>scalar(item)).filter(Boolean)
}

/**
 * Read the deliberately small, explicit list-of-mappings format used by
 * config/scope.yaml. Unknown targets remain blocked when the list is empty.
 */
export async function loadScopeRules(root:string):Promise<ScopeRule[]>{
  const file=path.join(root,"config","scope.yaml")
  if(!await Bun.file(file).exists())throw new Error("SCOPE_CONFIG_NOT_FOUND: "+file)
  const source=await Bun.file(file).text()
  const rules:ScopeRule[]=[]
  let section:"rules"|"exclusions"|null=null
  let sectionIndent=-1
  let current:ScopeRule|null=null

  const finish=()=>{
    if(!current)return
    if(!current.value.trim())throw new Error("SCOPE_RULE_INVALID: each rule must define value")
    rules.push(current)
    current=null
  }

  for(const line of source.split(/\r?\n/)){
    if(!line.trim()||line.trim().startsWith("#"))continue
    const header=line.match(/^(\s*)(rules|exclusions):\s*(.*?)\s*$/)
    if(header){
      finish()
      section=header[3]==="[]" ? null : header[2] as "rules"|"exclusions"
      sectionIndent=header[1].length
      continue
    }
    if(!section)continue

    const indent=line.match(/^\s*/)?.[0].length??0
    if(indent<=sectionIndent){
      finish()
      section=null
      continue
    }

    const item=line.match(/^\s*-\s*(.*?)\s*$/)
    if(item){
      finish()
      current={value:"",...(section==="exclusions"?{exclude:true}:{})}
      if(item[1]){
        const pair=item[1].match(/^([A-Za-z_-]+):\s*(.*?)\s*$/)
        if(pair){
          const key=pair[1]
          assignRuleField(current,key,pair[2])
        }else{
          current.value=scalar(item[1])
        }
      }
      continue
    }

    if(!current)throw new Error("SCOPE_RULE_INVALID: expected a list item beneath "+section)
    const pair=line.trim().match(/^([A-Za-z_-]+):\s*(.*?)\s*$/)
    if(!pair)throw new Error("SCOPE_RULE_INVALID: unsupported rule syntax: "+line.trim())
    assignRuleField(current,pair[1],pair[2])
  }

  finish()
  return rules
}

function assignRuleField(rule:ScopeRule,key:string,raw:string){
  if(key==="value")rule.value=scalar(raw)
  else if(key==="path")rule.path=scalar(raw)
  else if(key==="protocols")rule.protocols=scalarList(raw)
  else if(key==="ports"){
    const ports=scalarList(raw).map(Number)
    if(ports.some(port=>!Number.isInteger(port)||port<1||port>65535)){
      throw new Error("SCOPE_RULE_INVALID: ports must be integers between 1 and 65535")
    }
    rule.ports=ports
  }else if(key==="exclude"){
    const value=scalar(raw).toLowerCase()
    if(value!=="true"&&value!=="false")throw new Error("SCOPE_RULE_INVALID: exclude must be true or false")
    rule.exclude=value==="true"
  }else{
    throw new Error("SCOPE_RULE_INVALID: unsupported field "+key)
  }
}

export function checkScope(target:string,rules:ScopeRule[]):ScopeDecision{
  const parsed=parseTarget(target)
  if(!parsed)return{allowed:false,normalized:"",reason:"empty-target"}

  let matched=false
  let excluded=false

  for(const rule of rules){
    if(!hostMatch(parsed.host,rule.value))continue
    if(!rulePathMatches(parsed,rule))continue
    if(!ruleProtocolMatches(parsed,rule))continue
    if(!rulePortMatches(parsed,rule))continue

    matched=true
    if(rule.exclude)excluded=true
  }

  if(!matched)return{allowed:false,normalized:parsed.normalized,reason:"out-of-scope"}
  if(excluded)return{allowed:false,normalized:parsed.normalized,reason:"explicit-exclusion"}
  return{allowed:true,normalized:parsed.normalized,reason:"in-scope"}
}
