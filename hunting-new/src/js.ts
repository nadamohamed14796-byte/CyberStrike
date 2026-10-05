export type JSAsset={js_asset_id:string;url:string;parent_asset?:string;relationship_type?:string;content_hash:string;size:number;content_type?:string;framework?:string;build_system?:string;source_map_available:boolean;first_seen:string;last_seen:string}
export type JSRequest={method:string;endpoint:string;parameters:{name:string;location:string;confidence:number}[];headers:{name:string;authentication_related:boolean;confidence:number}[];body:Record<string,string>;source_function?:string;confidence:number}
const endpoint=/(?:fetch|axios(?:\.(?:get|post|put|patch|delete))?|XMLHttpRequest|open)\s*\(?[^"'\`]*["'\`]([^"'\`]+)["'\`]/g
const method=/method\s*:\s*["'\`](GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)["'\`]/gi
const param=/[?&]([A-Za-z_][A-Za-z0-9_-]*)[=]/g
const pathParam=/\/\{([A-Za-z_][A-Za-z0-9_-]*)\}/g
const jsonKey=/["']([A-Za-z_][A-Za-z0-9_-]*)["']\s*:/g
const authHeader=/["'\`](authorization|x-csrf-token|x-api-key|api-key|cookie)["'\`]/gi
function unique<T>(items:T[]){return[...new Set(items)]}
export function analyzeJS(content:string,url:string,now=new Date().toISOString()){
  const hash=Bun.hash(content).toString(16),endpoints=unique([...content.matchAll(endpoint)].map(x=>x[1]))
  const methods=unique([...content.matchAll(method)].map(x=>x[1].toUpperCase()))
  const params=new Map<string,{name:string;location:string;confidence:number}>()
  for(const m of content.matchAll(param))params.set(m[1],{name:m[1],location:"query",confidence:.85})
  for(const m of content.matchAll(pathParam))params.set(m[1],{name:m[1],location:"path",confidence:.88})
  for(const m of content.matchAll(jsonKey))params.set(m[1],{name:m[1],location:"body-or-object",confidence:.65})
  const headers=unique([...content.matchAll(authHeader)].map(x=>x[1].toLowerCase())).map(name=>({name,authentication_related:true,confidence:.9}))
  const body=Object.fromEntries([...content.matchAll(jsonKey)].slice(0,100).map(x=>[x[1],"<dynamic>"]))
  const framework=/_next\//i.test(content)||/next\.js/i.test(content)?"Next.js":/__NUXT__|nuxt/i.test(content)?"Nuxt":/angular/i.test(content)?"Angular":/vue/i.test(content)?"Vue":/react/i.test(content)?"React":/svelte/i.test(content)?"Svelte":undefined
  const build_system=/webpackChunk|webpackJsonp/i.test(content)?"Webpack":/import\.meta\.glob/i.test(content)?"Vite":/rollup/i.test(content)?"Rollup":undefined
  const graphql_operations=unique([...content.matchAll(/(?:query|mutation|subscription)\s+([A-Za-z0-9_]+)/g)].map(x=>x[1]))
  const websockets=unique([...content.matchAll(/new\s+WebSocket\s*\(\s*["'\`]([^"'\`]+)["'\`]/g)].map(x=>x[1]))
  const requests:JSRequest[]=endpoints.map(value=>({method:methods[0]??"UNKNOWN",endpoint:value,parameters:[...params.values()],headers,body,confidence:methods.length ? .75 : .55}))
  return{asset:{js_asset_id:"js_"+hash,url,content_hash:hash,size:new TextEncoder().encode(content).byteLength,content_type:"application/javascript",framework,build_system,source_map_available:/\.js\.map(?:["'\`]|$)/i.test(content),first_seen:now,last_seen:now} satisfies JSAsset,endpoints,methods,requests,headers,parameters:[...params.values()],request_bodies:[body],graphql_operations,websockets,auth_patterns:headers.map(x=>x.name),security_leads:[...(/\bgraphql\b/i.test(content)?["graphql_detected"]:[]),...(/\bWebSocket\s*\(/i.test(content)?["websocket_detected"]:[]),...(/\btenant_id\b|\btenantId\b/i.test(content)?["tenant_identifier_detected"]:[]),...(/\b(?:user|account|resource)_id\b/i.test(content)?["object_identifier_detected"]:[]),...(/\b(?:redirect|return_url|callback|next)\b/i.test(content)?["redirect_parameter_detected"]:[]),...(/\b(?:role|permissions?)\b/i.test(content)?["authorization_signal"]:[])]}
}
export function discoverScripts(html:string,base:string){const urls=new Set<string>();for(const m of html.matchAll(/<script[^>]+src=["'\`]([^"'\`]+)["'\`]/gi)){try{urls.add(new URL(m[1],base).href)}catch{}}for(const m of html.matchAll(/(?:modulepreload|preload)[^>]+href=["'\`]([^"'\`]+\.js[^"'\`]*)["'\`]/gi)){try{urls.add(new URL(m[1],base).href)}catch{}}return[...urls]}
export function discoverReferencedScripts(js:string,base:string){const urls=new Set<string>();for(const m of js.matchAll(/(?:import\s*\(|import\s+[^"'\`]*from\s*|src\s*=\s*)["'\`]([^"'\`]+\.js(?:\?[^"'\`]*)?)["'\`]/g)){try{urls.add(new URL(m[1],base).href)}catch{}}return[...urls]}
export function securitySignals(result:ReturnType<typeof analyzeJS>){return result.security_leads.map(signal=>({signal,source:"javascript",confidence:.8,endpoint:result.endpoints[0]}))}
