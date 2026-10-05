export type JSAsset={js_asset_id:string;url:string;parent_asset?:string;relationship_type?:string;content_hash:string;size:number;content_type?:string;framework?:string;build_system?:string;source_map_available:boolean;first_seen:string;last_seen:string}
const endpoint=/(?:fetch|axios(?:\\.(?:get|post|put|patch|delete))?|XMLHttpRequest|open)\\s*\\(?[^"'\`]*["'\`]([^"'\`]+)["'\`]/g
const method=/method\\s*:\\s*["'\`](GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)["'\`]/gi
const param=/[?&]([A-Za-z_][A-Za-z0-9_-]*)[=]/g
const authHeader=/["'\`](authorization|x-csrf-token|x-api-key|api-key|cookie)["'\`]/gi
export function analyzeJS(content:string,url:string,now=new Date().toISOString()){
  const hash=Bun.hash(content).toString(16),endpoints=new Set<string>()
  for(const m of content.matchAll(endpoint))endpoints.add(m[1])
  const methods=[...content.matchAll(method)].map(x=>x[1].toUpperCase())
  const params=new Map<string,{name:string;location:string;confidence:number}>()
  for(const m of content.matchAll(param))params.set(m[1],{name:m[1],location:"query",confidence:.85})
  const headers=[...new Set([...content.matchAll(authHeader)].map(x=>x[1].toLowerCase()))].map(name=>({name,authentication_related:true,confidence:.9}))
  const framework=/_next\\/|next\\.js/i.test(content)?"Next.js":/__NUXT__|nuxt/i.test(content)?"Nuxt":/react/i.test(content)?"React":undefined
  const build_system=/webpackChunk|webpackJsonp/i.test(content)?"Webpack":/import\\.meta\\.glob/i.test(content)?"Vite":undefined
  return {asset:{js_asset_id:"js_"+hash,url,content_hash:hash,size:new TextEncoder().encode(content).byteLength,content_type:"application/javascript",framework,build_system,source_map_available:/\\.js\\.map(?:["'\`]|$)/i.test(content),first_seen:now,last_seen:now} satisfies JSAsset,endpoints:[...endpoints],methods,headers,parameters:[...params.values()],security_leads:[...(/\\bgraphql\\b/i.test(content)?["graphql_detected"]:[]),...(/\\bWebSocket\\s*\\(/i.test(content)?["websocket_detected"]:[]),...(/\\btenant_id\\b|\\btenantId\\b/i.test(content)?["tenant_identifier_detected"]:[]),...(/\\b(?:user|account|resource)_id\\b/i.test(content)?["object_identifier_detected"]:[]),...(/\\b(?:redirect|return_url|callback|next)\\b/i.test(content)?["redirect_parameter_detected"]:[])]}
}
export function discoverScripts(html:string,base:string){const urls=new Set<string>();for(const m of html.matchAll(/<script[^>]+src=["'\`]([^"'\`]+)["'\`]/gi)){try{urls.add(new URL(m[1],base).href)}catch{}}for(const m of html.matchAll(/(?:modulepreload|preload)[^>]+href=["'\`]([^"'\`]+\\.js[^"'\`]*)["'\`]/gi)){try{urls.add(new URL(m[1],base).href)}catch{}}return[...urls]}
