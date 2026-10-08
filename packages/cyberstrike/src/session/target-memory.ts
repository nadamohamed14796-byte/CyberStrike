import { Database, eq, and, desc, isNull } from "../storage/db"
import { Request } from "./request"
import { TargetMemoryTable } from "./target-memory.sql"
import { SessionTable } from "./session.sql"
import { Identifier } from "../id/id"

export namespace TargetMemory {
  export type Kind =
    | "endpoint"
    | "javascript"
    | "asset"
    | "technology"
    | "parameter"
    | "finding"
    | "rejected-finding"
    | "technique"

  export interface Info {
    id: string
    project_id: string
    kind: Kind
    asset: string
    method?: string
    url: string
    request_id?: string
    page_url?: string
    content_type?: string
    content?: string
    metadata?: Record<string, unknown>
    confidence?: number
    time: { created: number; updated: number }
  }

  function mergeProvenance(previous: Record<string, unknown> | null | undefined, next: Record<string, unknown>) {
    const merged = { ...(previous ?? {}), ...next }
    for (const key of [
      "credential_ids",
      "request_ids",
      "source_request_ids",
      "source_memory_ids",
      "source_tools",
      "source_call_ids",
      "source_finding_ids",
      "extracted_urls",
    ]) {
      const values = [
        ...(Array.isArray(previous?.[key]) ? previous[key].filter((x) => typeof x === "string") : []),
        ...(Array.isArray(next[key]) ? next[key].filter((x) => typeof x === "string") : []),
      ]
      if (values.length) merged[key] = Array.from(new Set(values))
    }
    return merged
  }

  function upsertDiscovery(input: {
    projectID: string
    kind: Kind
    asset: string
    method: string | null
    url: string
    metadata: Record<string, unknown>
  }) {
    return Database.use((db) => {
      const existing = db
        .select()
        .from(TargetMemoryTable)
        .where(
          and(
            eq(TargetMemoryTable.project_id, input.projectID),
            eq(TargetMemoryTable.kind, input.kind),
            input.method === null ? isNull(TargetMemoryTable.method) : eq(TargetMemoryTable.method, input.method),
            eq(TargetMemoryTable.url, input.url),
          ),
        )
        .get()
      if (existing) {
        db.update(TargetMemoryTable)
          .set({
            request_id:
              existing.request_id ??
              (typeof input.metadata.source_request_id === "string" ? input.metadata.source_request_id : null),
            metadata: mergeProvenance(existing.metadata, input.metadata),
            time_updated: Date.now(),
          })
          .where(eq(TargetMemoryTable.id, existing.id))
          .run()
        return false
      }
      db.insert(TargetMemoryTable)
        .values({
          id: Identifier.ascending("target_memory"),
          project_id: input.projectID,
          kind: input.kind,
          asset: input.asset,
          method: input.method,
          url: input.url,
          metadata: input.metadata,
          time_created: Date.now(),
          time_updated: Date.now(),
        })
        .run()
      return true
    })
  }

  function projectIDForSession(sessionID: string): string | undefined {
    return Database.use(
      (db) =>
        db
          .select({ project_id: SessionTable.project_id })
          .from(SessionTable)
          .where(eq(SessionTable.id, sessionID))
          .get()?.project_id,
    )
  }

  export function rememberRequest(sessionID: string, request: Request.Info): void {
    const projectID = projectIDForSession(sessionID)
    if (!projectID || !request.host) return

    const scheme = request.scheme ?? "https"
    const port = request.port ? `:${request.port}` : ""
    const path = request.canonical_path || request.normalized_path || "/"
    const url = `${scheme}://${request.host}${port}${path.startsWith("/") ? path : "/" + path}`
    const kind: Kind =
      request.response_content_type && /(javascript|ecmascript)/i.test(request.response_content_type)
        ? "javascript"
        : "endpoint"

    const id = Identifier.ascending("target_memory")
    const now = Date.now()
    Database.use((db) => {
      const existing = db
        .select()
        .from(TargetMemoryTable)
        .where(
          and(
            eq(TargetMemoryTable.project_id, projectID),
            eq(TargetMemoryTable.kind, kind),
            eq(TargetMemoryTable.method, request.method),
            eq(TargetMemoryTable.url, url),
          ),
        )
        .get()

      const previous = (existing?.metadata as Record<string, unknown> | null) ?? {}
      const previousCredentialIDs = Array.isArray(previous.credential_ids)
        ? previous.credential_ids.filter((value): value is string => typeof value === "string")
        : []
      const credentialIDs =
        request.credential_id && !previousCredentialIDs.includes(request.credential_id)
          ? [...previousCredentialIDs, request.credential_id]
          : previousCredentialIDs

      if (existing) {
        db.update(TargetMemoryTable)
          .set({
            request_id: request.id,
            page_url: request.page_url ?? existing.page_url,
            content_type: request.response_content_type ?? existing.content_type,
            content: kind === "javascript" ? (request.processed_response ?? existing.content) : existing.content,
            metadata: {
              ...previous,
              normalized_path: request.normalized_path,
              template_id: request.template_id ?? previous.template_id ?? null,
              credential_id: request.credential_id ?? previous.credential_id ?? null,
              credential_ids: credentialIDs,
              request_ids: Array.from(
                new Set([
                  ...(Array.isArray(previous.request_ids)
                    ? previous.request_ids.filter((value): value is string => typeof value === "string")
                    : []),
                  request.id,
                ]),
              ),
            },
            time_updated: now,
          })
          .where(eq(TargetMemoryTable.id, existing.id))
          .run()
        return
      }

      db.insert(TargetMemoryTable)
        .values({
          id,
          project_id: projectID,
          kind,
          asset: request.host!,
          method: request.method,
          url,
          request_id: request.id,
          page_url: request.page_url ?? null,
          content_type: request.response_content_type ?? null,
          content: kind === "javascript" ? (request.processed_response ?? null) : null,
          metadata: {
            normalized_path: request.normalized_path,
            template_id: request.template_id ?? null,
            credential_id: request.credential_id ?? null,
            credential_ids: request.credential_id ? [request.credential_id] : [],
            request_ids: [request.id],
          },
          time_created: now,
          time_updated: now,
        })
        .onConflictDoNothing()
        .run()
    })
  }

  /** Promote URL-bearing discovery output into durable target memory. */
  export function rememberDiscovery(
    sessionID: string,
    input: { tool: string; output: unknown; signal?: string; callID?: string },
  ): number {
    const projectID = projectIDForSession(sessionID)
    if (!projectID) return 0
    const raw =
      typeof input.output === "string"
        ? input.output
        : input.output && typeof input.output === "object"
          ? JSON.stringify(input.output)
          : ""
    if (!raw) return 0

    const urls = new Set<string>()
    for (const token of raw.split(/\s+/)) {
      const value = token.replace(/^[("'\\[]+|[),.;'\\]"]+$/g, "")
      if (!/^https?:\/\//i.test(value)) continue
      try {
        const url = new URL(value)
        url.hash = ""
        if (url.protocol === "http:" || url.protocol === "https:") urls.add(url.toString())
      } catch {}
      if (urls.size >= 500) break
    }

    let stored = 0
    for (const url of urls) {
      const parsed = new URL(url)
      const isJS = /\.m?js(?:[?#]|$)/i.test(parsed.pathname) || /javascript|ecmascript/i.test(input.signal ?? "")
      const kind: Kind = isJS ? "javascript" : "endpoint"
      upsertDiscovery({
        projectID,
        kind,
        asset: parsed.host,
        method: kind === "endpoint" ? "GET" : null,
        url,
        metadata: {
          source_tool: input.tool,
          source_tools: [input.tool],
          signal: input.signal ?? null,
          call_id: input.callID ?? null,
          source_call_ids: input.callID ? [input.callID] : [],
          discovered: true,
          extracted_urls: [url],
        },
      })
      stored++
    }
    return stored
  }

  export function rememberKnowledge(
    sessionID: string,
    input: {
      kind: Exclude<Kind, "endpoint" | "javascript">
      asset: string
      url?: string
      metadata?: Record<string, unknown>
      confidence?: number
    },
  ): void {
    const projectID = projectIDForSession(sessionID)
    if (!projectID || !input.asset.trim()) return
    const now = Date.now()
    const url = input.url ?? (input.kind === "asset" ? input.asset : "memory://" + input.kind + "/" + input.asset)
    Database.use((db) =>
      db
        .insert(TargetMemoryTable)
        .values({
          id: Identifier.ascending("target_memory"),
          project_id: projectID,
          kind: input.kind,
          asset: input.asset.trim().toLowerCase(),
          url,
          metadata: { ...(input.metadata ?? {}), confidence: input.confidence ?? 50 },
          time_created: now,
          time_updated: now,
        })
        .onConflictDoNothing()
        .run(),
    )
  }

  /** Promote conservative endpoint/parameter references found in stored JavaScript. */
  export function extractJavascriptIntel(sessionID: string, requestID?: string): number {
    const projectID = projectIDForSession(sessionID)
    if (!projectID) return 0
    const scripts = requestID
      ? list(projectID, "javascript", 1000).filter((script) => script.request_id === requestID)
      : list(projectID, "javascript", 1000)
    let stored = 0
    const absolute = /https?:\/\/[^"'\s<>]+/gi
    const relative = /["'`]((?:\/api\/|\/v1\/|\/v2\/|\/graphql(?:\?|$)|\/rest\/)[A-Za-z0-9_./?=&:%{}$-]{1,240})["'`]/gi
    const params = /[?&]([A-Za-z_][A-Za-z0-9_.-]{0,63})=/g
    for (const js of scripts) {
      const content = js.content ?? ""
      if (!content) continue
      const refs = new Set<string>()
      for (const m of content.matchAll(absolute)) refs.add(m[0].replace(/[),.;]+$/g, ""))
      for (const m of content.matchAll(relative)) refs.add(m[1])
      for (const ref of refs) {
        let url: URL
        try {
          url = new URL(ref, js.url)
        } catch {
          continue
        }
        if (url.protocol !== "http:" && url.protocol !== "https:") continue
        try {
          upsertDiscovery({
            projectID,
            kind: "endpoint",
            asset: url.host,
            method: "GET",
            url: url.toString(),
            metadata: {
              source: "javascript",
              source_memory_id: js.id,
              source_memory_ids: [js.id],
              source_request_id: js.request_id ?? null,
              source_request_ids: js.request_id ? [js.request_id] : [],
              credential_id: js.metadata?.credential_id ?? null,
              credential_ids: typeof js.metadata?.credential_id === "string" ? [js.metadata.credential_id] : [],
              extracted_url: ref,
              extracted_urls: [ref],
            },
          })
          stored++
        } catch {}
      }
      for (const m of content.matchAll(params)) {
        const name = m[1]
        try {
          upsertDiscovery({
            projectID,
            kind: "parameter",
            asset: js.url,
            method: null,
            url: "memory://parameter/" + encodeURIComponent(js.url) + "/" + encodeURIComponent(name),
            metadata: {
              source: "javascript",
              source_memory_id: js.id,
              source_memory_ids: [js.id],
              source_request_id: js.request_id ?? null,
              source_request_ids: js.request_id ? [js.request_id] : [],
              credential_id: js.metadata?.credential_id ?? null,
              credential_ids: typeof js.metadata?.credential_id === "string" ? [js.metadata.credential_id] : [],
              parameter: name,
            },
          })
          stored++
        } catch {}
      }
    }
    return stored
  }
  /** Link JS memories to the canonical request that delivered the script. */
  export function correlateJavascript(sessionID: string): number {
    const projectID = projectIDForSession(sessionID)
    if (!projectID) return 0
    const requests = Request.get(sessionID)
    const javascript = list(projectID, "javascript", 1000)
    let linked = 0
    for (const js of javascript) {
      if (js.request_id) continue
      let parsed: URL
      try {
        parsed = new URL(js.url)
      } catch {
        continue
      }
      const match = requests.find((request) => {
        if (!request.host || request.host.toLowerCase() !== parsed.host.toLowerCase()) return false
        const requestPath = request.canonical_path || request.normalized_path
        if (requestPath !== parsed.pathname) return false
        return request.response_content_type
          ? /(javascript|ecmascript)/i.test(request.response_content_type)
          : /\.m?js$/i.test(parsed.pathname)
      })
      if (!match) continue
      Database.use((db) =>
        db
          .update(TargetMemoryTable)
          .set({
            request_id: match.id,
            page_url: match.page_url ?? null,
            content_type: match.response_content_type ?? js.content_type ?? null,
            content: match.processed_response ?? js.content ?? null,
            metadata: {
              ...(js.metadata ?? {}),
              request_id: match.id,
              request_ids: Array.from(
                new Set([
                  ...(Array.isArray(js.metadata?.request_ids)
                    ? js.metadata.request_ids.filter((value) => typeof value === "string")
                    : []),
                  match.id,
                ]),
              ),
              source_request_ids: Array.from(
                new Set([
                  ...(Array.isArray(js.metadata?.source_request_ids)
                    ? js.metadata.source_request_ids.filter((value) => typeof value === "string")
                    : []),
                  match.id,
                ]),
              ),
              credential_id: match.credential_id ?? null,
              credential_ids: Array.from(
                new Set([
                  ...(Array.isArray(js.metadata?.credential_ids)
                    ? js.metadata.credential_ids.filter((value) => typeof value === "string")
                    : []),
                  ...(match.credential_id ? [match.credential_id] : []),
                ]),
              ),
              correlated: true,
            },
            time_updated: Date.now(),
          })
          .where(and(eq(TargetMemoryTable.id, js.id), eq(TargetMemoryTable.project_id, projectID)))
          .run(),
      )
      linked++
    }
    return linked
  }

  export function projectID(sessionID: string): string | undefined {
    return projectIDForSession(sessionID)
  }

  export function listForSession(sessionID: string, kind?: Kind, limit = 200): Info[] {
    const projectID = projectIDForSession(sessionID)
    return projectID ? list(projectID, kind, limit) : []
  }

  export function list(projectID: string, kind?: Kind, limit = 200): Info[] {
    const rows = Database.use((db) => {
      const query = db
        .select()
        .from(TargetMemoryTable)
        .where(
          kind
            ? and(eq(TargetMemoryTable.project_id, projectID), eq(TargetMemoryTable.kind, kind))
            : eq(TargetMemoryTable.project_id, projectID),
        )
      return query.orderBy(desc(TargetMemoryTable.time_updated)).limit(limit).all()
    })
    return rows.map((r) => ({
      id: r.id,
      project_id: r.project_id,
      kind: r.kind as Kind,
      asset: r.asset,
      method: r.method ?? undefined,
      url: r.url,
      request_id: r.request_id ?? undefined,
      page_url: r.page_url ?? undefined,
      content_type: r.content_type ?? undefined,
      content: r.content ?? undefined,
      metadata: (r.metadata as Record<string, unknown>) ?? undefined,
      confidence:
        typeof (r.metadata as Record<string, unknown> | null)?.confidence === "number"
          ? ((r.metadata as Record<string, unknown>).confidence as number)
          : undefined,
      time: { created: r.time_created, updated: r.time_updated },
    }))
  }
}
