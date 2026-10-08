import { TargetMemory } from "./target-memory"
import { Request } from "./request"
import { ToolArtifact } from "../tool/artifact"

export namespace RequestCorrelation {
  export type Node = {
    javascript: TargetMemory.Info
    requests: Request.Info[]
    artifacts: ReturnType<typeof ToolArtifact.list>
  }

  function parsed(url?: string) {
    if (!url) return undefined
    try {
      return new URL(url)
    } catch {
      return undefined
    }
  }

  function sameDelivery(request: Request.Info, javascript: TargetMemory.Info): boolean {
    const jsURL = parsed(javascript.url)
    if (!jsURL || !request.host) return false
    if (request.host.toLowerCase() !== jsURL.host.toLowerCase()) return false

    const requestPath = request.canonical_path || request.normalized_path || "/"
    if (requestPath !== jsURL.pathname) return false

    if (request.scheme && request.scheme !== jsURL.protocol.slice(0, -1)) return false
    if (request.port && String(request.port) !== (jsURL.port || (jsURL.protocol === "https:" ? "443" : "80")))
      return false

    return Boolean(request.response_content_type && /(javascript|ecmascript)/i.test(request.response_content_type))
  }

  export function forJavascript(sessionID: string, javascript: TargetMemory.Info): Node {
    const requests = Request.get(sessionID)
    const explicitRequestID =
      javascript.request_id ??
      (typeof javascript.metadata?.request_id === "string" ? javascript.metadata.request_id : undefined)

    const correlated = requests.filter(
      (request) => Boolean(explicitRequestID && request.id === explicitRequestID) || sameDelivery(request, javascript),
    )

    const artifacts = correlated
      .flatMap((request) => ToolArtifact.byRequest(sessionID, request.id))
      .filter((artifact, index, all) => all.findIndex((item) => item.id === artifact.id) === index)

    return { javascript, requests: correlated, artifacts }
  }

  export function forRequest(sessionID: string, requestID: string) {
    const request = Request.get(sessionID).find((item) => item.id === requestID)
    if (!request) return undefined
    const artifacts = ToolArtifact.byRequest(sessionID, requestID)
    const javascript = TargetMemory.byRequest(sessionID, requestID, "javascript")
    return { request, javascript, artifacts }
  }
}
