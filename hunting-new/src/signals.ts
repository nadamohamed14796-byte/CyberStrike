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


export interface CorrelationSignalInput {
  target: string
  requests: Array<{
    id: string
    url: string
    path?: string
    credentialId?: string
    accountLabel?: string
    observedAt: number
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

    if (request.credentialId || request.accountLabel) {
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

    if (response && (response.status === 401 || response.status === 403)) {
      emit({
        signal: "waf_signal_detected",
        source: "correlation:response",
        confidence: response.status === 403 ? 0.74 : 0.52,
        target: input.target,
        endpoint,
        metadata: { requestId: request.id, responseId: response.id, status: response.status },
      })
    }
  }

  for (const asset of input.jsAssets) {
    emit({
      signal: "javascript_asset",
      source: "correlation:js",
      confidence: 0.86,
      target: input.target,
      metadata: { jsAssetId: asset.id, url: asset.url },
    })
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
