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
