import { TargetMemory } from "./target-memory"
import { Request } from "./request"
import { ToolArtifact } from "../tool/artifact"

export namespace RequestCorrelation {
  export type Node = {
    javascript: TargetMemory.Info
    requests: Request.Info[]
    artifacts: ReturnType<typeof ToolArtifact.list>
  }

  function hostOf(url?: string) {
    if (!url) return undefined
    try { return new URL(url).host.toLowerCase() } catch { return undefined }
  }

  function pathOf(url?: string) {
    if (!url) return undefined
    try { return new URL(url).pathname } catch { return undefined }
  }

  /**
   * Build the canonical JS -> request/response -> tool-artifact graph from
   * persistent records. No second request store is introduced.
   */
  export function forJavascript(sessionID: string, javascript: TargetMemory.Info): Node {
    const requests = Request.get(sessionID)
    const jsHost = hostOf(javascript.url)
    const jsPath = pathOf(javascript.url)
    const metadata = javascript.metadata ?? {}
    const explicitRequestID = javascript.request_id ?? (
      typeof metadata.request_id === "string" ? metadata.request_id : undefined
    )

    const correlated = requests.filter((request) => {
      if (explicitRequestID && request.id === explicitRequestID) return true
      if (jsHost && request.host?.toLowerCase() !== jsHost) return false
      const page = hostOf(request.page_url)
      if (page === jsHost) return true
      const requestPath = request.canonical_path || request.normalized_path
      // A JS response is correlated only when the request itself identifies a
      // script response. Do not guess API relationships from shared hosts.
      return Boolean(
        jsPath &&
        requestPath &&
        jsPath === requestPath &&
        request.response_content_type &&
        /(javascript|ecmascript)/i.test(request.response_content_type),
      )
    })

    const ids = new Set(correlated.map((request) => request.id))
    const artifacts = ToolArtifact.list(sessionID, 500).filter((artifact) =>
      artifact.request_id != null && ids.has(artifact.request_id),
    )

    return { javascript, requests: correlated, artifacts }
  }

  export function forRequest(sessionID: string, requestID: string) {
    const request = Request.get(sessionID).find((item) => item.id === requestID)
    if (!request) return undefined
    const artifacts = ToolArtifact.byRequest(sessionID, requestID)
    const javascript = TargetMemory.listForSession(sessionID, "javascript", 500)
      .filter((item) => item.request_id === requestID || item.url === request.page_url)
    return { request, javascript, artifacts }
  }
}
