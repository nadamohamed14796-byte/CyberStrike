import { canonicalSignal, canonicalSignals } from "./canonical-signals"
export type Signal={signal:string;source:string;confidence:number;target:string;timestamp:string;endpoint?:string;function_id?:string;metadata?:Record<string,unknown>}
export type SkillRule={name:string;confidence_threshold:number;required_signals:string[];optional_signals?:string[];dependencies?:string[];priority?:number;maximum_parallel_tasks?:number}
export type SkillSelection=SkillRule & { matchedSignals:string[]; score:number }

export class SignalEngine{
  private signals:Signal[]=[]
  emit(signal:Omit<Signal,"timestamp">){
    const item={...signal,signal:canonicalSignal(signal.signal),confidence:Math.max(0,Math.min(1,signal.confidence)),timestamp:new Date().toISOString()}
    this.signals.push(item)
    return item
  }
  list(){return [...this.signals]}
  forTarget(target:string){return this.signals.filter(x=>x.target===target)}
  selectSkills(rules:SkillRule[], target?:string):SkillSelection[]{
    const signals=target?this.forTarget(target):this.signals
    return rules
      .map(r=>{
        const matchedSignals=[...new Set(signals.filter(s=>canonicalSignals(r.required_signals).includes(canonicalSignal(s.signal))&&s.confidence>=r.confidence_threshold).map(s=>canonicalSignal(s.signal)))]
        const requiredSatisfied=canonicalSignals(r.required_signals).every(x=>signals.some(s=>canonicalSignal(s.signal)===x))
        const score=matchedSignals.length/Math.max(1,r.required_signals.length)
        return { ...r, matchedSignals, score, requiredSatisfied }
      })
      .filter(x=>x.requiredSatisfied && x.matchedSignals.length>0)
      .sort((a,b)=>(b.score-a.score)||((b.priority??0)-(a.priority??0)))
      .map(({requiredSatisfied:_,...skill})=>skill)
  }
}


export interface CorrelationSignalInput {
  target: string
  requests: Array<{
    id: string
    url: string
    method?: string
    path?: string
    credentialId?: string
    accountLabel?: string
    observedAt: number
    source?: "observed" | "browser" | "js" | "inferred" | "replay"
  }>
  responses: Array<{
    id: string
    requestId: string
    status: number
    headers: Record<string, string>
    observedAt: number
  }>
  jsAssets: Array<{ id: string; url: string; observedAt: number }>
  functions: Array<{ id: string; name: string; assetId?: string }>
  edges: Array<{
    from: string
    to: string
    kind: string
    confidence: number
    evidence: string
  }>
}

const OBJECT_ID_PATTERN = /(?:^|[/?_=-])(id|uid|user[_-]?id|account[_-]?id|object[_-]?id|item[_-]?id|tenant[_-]?id)(?:[/?_=-]|$)/i
const AUTH_PATH_PATTERN = /(?:login|logout|account|profile|settings|admin|dashboard|api|graphql|user|tenant)/i

function requestSourceValue(request:CorrelationSignalInput["requests"][number]):"js"|"observed"|"other"{
  return request.source==="js" ? "js" : request.source==="observed" ? "observed" : "other"
}

export function signalsFromCorrelation(input: CorrelationSignalInput): Signal[] {
  const out: Signal[] = []
  const responseByRequest = new Map(input.responses.map(response => [response.requestId, response]))
  const emitted = new Set<string>()

  const emit = (signal: Omit<Signal, "timestamp">) => {
    const key = [
      signal.signal,
      signal.endpoint ?? "",
      signal.function_id ?? "",
      signal.source,
    ].join("|")
    if (emitted.has(key)) return
    emitted.add(key)
    out.push({ ...signal, confidence: Math.max(0, Math.min(1, signal.confidence)), timestamp: new Date().toISOString() })
  }

  for (const request of input.requests) {
    const endpoint = request.path ?? request.url
    const response = responseByRequest.get(request.id)
    const urlText = request.url + " " + endpoint
    const queryOrFragment = urlText.split("?")[1] ?? ""
    const method = (request.method ?? "").toUpperCase()

    if (/\\bgraphql\\b|\\/graphql(?:[/?]|$)/i.test(urlText)) {
      emit({
        signal: "graphql_detected",
        source: "correlation:request",
        confidence: 0.86,
        target: input.target,
        endpoint,
        metadata: { requestId: request.id, method },
      })
    }

    if (/^(?:ws|wss):\\/\\//i.test(request.url) || /\\bwebsocket\\b/i.test(urlText)) {
      emit({
        signal: "websocket_detected",
        source: "correlation:request",
        confidence: 0.86,
        target: input.target,
        endpoint,
        metadata: { requestId: request.id, method },
      })
    }

    if (/\\b(?:jwt|authorization)\\b/i.test(urlText) || /(?:^|\\s)authorization\\s*:/i.test(
      Object.keys(response?.headers ?? {}).join("\\n")
    )) {
      emit({
        signal: "jwt_detected",
        source: "correlation:request",
        confidence: 0.62,
        target: input.target,
        endpoint,
        metadata: { requestId: request.id, presenceOnly: true },
      })
    }

    if (/\\b(?:upload|multipart|file)\\b/i.test(urlText) || /(?:multipart\\/form-data|application\\/octet-stream)/i.test(
      Object.entries(response?.headers ?? {}).map(([k,v]) => k + ": " + v).join("\\n")
    )) {
      emit({
        signal: "file_upload_detected",
        source: "correlation:request",
        confidence: 0.70,
        target: input.target,
        endpoint,
        metadata: { requestId: request.id, method },
      })
    }

    if (/(?:^|[?&])(?:redirect|redirect_uri|return|return_to|next|continue|url|dest|destination)=/i.test(queryOrFragment)) {
      emit({
        signal: "redirect_parameter_detected",
        source: "correlation:request",
        confidence: 0.78,
        target: input.target,
        endpoint,
        metadata: { requestId: request.id, method },
      })
    }

    if (/(?:^|[/?_=-])tenant(?:[_-]?id)?(?:[/?_=-]|$)/i.test(endpoint)) {
      emit({
        signal: "tenant_identifier_detected",
        source: "correlation:request",
        confidence: 0.80,
        target: input.target,
        endpoint,
        metadata: { requestId: request.id },
      })
    }

    if (request.credentialId || request.accountLabel) {
      const accountLabel = request.accountLabel ?? request.credentialId
      const shared = input.requests.filter(other =>
        (other.path ?? other.url) === endpoint &&
        other.id !== request.id &&
        Boolean(other.credentialId || other.accountLabel) &&
        (other.accountLabel ?? other.credentialId) !== accountLabel,
      )
      if (shared.length) {
        emit({
          signal: "multiple_accounts",
          source: "correlation:account",
          confidence: 0.91,
          target: input.target,
          endpoint,
          metadata: {
            requestId: request.id,
            accountLabel,
            distinctAccounts: [...new Set(shared.map(other => other.accountLabel ?? other.credentialId).filter(Boolean))],
          },
        })
      }
      emit({

      emit({
        signal: "authenticated_endpoint",
        source: "correlation:request",
        confidence: 0.88,
        target: input.target,
        endpoint,
        metadata: { requestId: request.id, accountLabel: request.accountLabel ?? null },
      })
    }

    if (OBJECT_ID_PATTERN.test(endpoint)) {
      emit({
        signal: "object_identifier_detected",
        source: "correlation:request",
        confidence: 0.82,
        target: input.target,
        endpoint,
        metadata: { requestId: request.id },
      })
    }

    if (AUTH_PATH_PATTERN.test(endpoint)) {
      emit({
        signal: "endpoint_discovery",
        source: "correlation:request",
        confidence: 0.72,
        target: input.target,
        endpoint,
        metadata: { requestId: request.id },
      })
    }

    if (response) {
      if (response.status === 401 || response.status === 403) {
        emit({
          signal: "access_control_blocked",
          source: "correlation:response",
          confidence: 0.72,
          target: input.target,
          endpoint,
          metadata: { requestId: request.id, responseId: response.id, status: response.status },
        })
      }

      const headerText = Object.entries(response.headers)
        .map(([key, value]) => key + ": " + value)
        .join("\\n")
      const wafHeader = /cloudflare|cf-ray|cloudfront|awswaf|akamai|imperva|incapsula|sucuri|f5|barracuda|fortiweb|wallarm/i.test(headerText)
      const wafStatus = response.status === 403 || response.status === 406 || response.status === 429
      if (wafHeader || wafStatus) {
        emit({
          signal: "waf_signal_detected",
          source: "correlation:response",
          confidence: wafHeader ? 0.86 : 0.68,
          target: input.target,
          endpoint,
          metadata: { requestId: request.id, responseId: response.id, status: response.status, wafHeader },
        })
      }
    }
  }

  const apiMethods=new Map<string,Map<"js"|"observed",Set<string>>>()
  for(const request of input.requests){
    const key=request.path ?? request.url
    const source=requestSourceValue(request)
    if(source!=="js" && source!=="observed")continue
    const methods=apiMethods.get(key) ?? new Map<"js"|"observed",Set<string>>()
    const values=methods.get(source) ?? new Set<string>()
    values.add(request.method.toUpperCase())
    methods.set(source,values)
    apiMethods.set(key,methods)
  }
  for(const [endpoint,methods] of apiMethods){
    const jsMethods=methods.get("js")
    const observedMethods=methods.get("observed")
    if(!jsMethods || !observedMethods)continue
    const mismatch=[...jsMethods].some(method=>[...observedMethods].every(value=>value!==method))
    if(!mismatch)continue
    const request=input.requests.find(item=>(item.path ?? item.url)===endpoint)
    emit({
      signal:"api_method_mismatch",
      source:"correlation:api-diff",
      confidence:0.74,
      target:input.target,
      endpoint,
      metadata:{
        jsMethods:[...jsMethods],
        observedMethods:[...observedMethods],
        requestId:request?.id ?? null,
      },
    })
  }

  for (const asset of input.jsAssets) {
    if (/\\.map(?:$|[?#])/i.test(asset.url)) {
      emit({
        signal: "source_map_detected",
        source: "correlation:js",
        confidence: 0.90,
        target: input.target,
        metadata: { jsAssetId: asset.id, url: asset.url },
      })
    }

    if (/\\.(?:js|mjs)(?:$|[?#])/i.test(asset.url)) {
      emit({
        signal: "javascript_asset",
        source: "correlation:js",
        confidence: 0.86,
        target: input.target,
        metadata: { jsAssetId: asset.id, url: asset.url },
      })
    } else {
      emit({
        signal: "javascript_asset",
        source: "correlation:js",
        confidence: 0.76,
        target: input.target,
        metadata: { jsAssetId: asset.id, url: asset.url },
      })
    }
  }
  for (const edge of input.edges.filter(edge => edge.kind === "triggered-by" || edge.kind === "observed-on")) {
    const request = input.requests.find(item => item.id === edge.to)
    if (!request) continue
    const endpoint = request.path ?? request.url
    if (edge.kind === "triggered-by") {
      emit({
        signal: "javascript_function_request_correlation",
        source: "correlation:edge",
        confidence: edge.confidence,
        target: input.target,
        endpoint,
        function_id: edge.from,
        metadata: { requestId: request.id },
      })
    }
  }

  return out
}

export function emitCorrelationSignals(
  engine: SignalEngine,
  input: CorrelationSignalInput,
): Signal[] {
  const generated = signalsFromCorrelation(input)
  for (const signal of generated) {
    engine.emit({
      signal: signal.signal,
      source: signal.source,
      confidence: signal.confidence,
      target: signal.target,
      endpoint: signal.endpoint,
      function_id: signal.function_id,
      metadata: signal.metadata,
    })
  }
  return generated
}


export function signalEngineFromCorrelation(input: CorrelationSignalInput): SignalEngine {
  const engine = new SignalEngine()
  emitCorrelationSignals(engine, input)
  return engine
}
