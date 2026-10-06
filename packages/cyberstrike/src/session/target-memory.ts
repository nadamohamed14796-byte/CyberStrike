import { Database, eq, and, desc } from "../storage/db"
import { TargetMemoryTable } from "./target-memory.sql"
import { SessionTable } from "./session.sql"
import { Identifier } from "../id/id"
import type { Request } from "./request"

export namespace TargetMemory {
  export type Kind = "endpoint" | "javascript"

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
    time: { created: number; updated: number }
  }

  function projectIDForSession(sessionID: string): string | undefined {
    return Database.use((db) =>
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
    const kind: Kind = request.response_content_type && /(javascript|ecmascript)/i.test(request.response_content_type)
      ? "javascript"
      : "endpoint"

    const id = Identifier.ascending("target_memory")
    const now = Date.now()
    Database.use((db) => {
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
    const raw = typeof input.output === "string"
      ? input.output
      : input.output && typeof input.output === "object" ? JSON.stringify(input.output) : ""
    if (!raw) return 0

    const urls = new Set<string>()
    for (const token of raw.split(/\s+/)) {
      const value = token.replace(/^[("'\[]+|[),.;'\]"]+$/g, "")
      if (!/^https?:\/\//i.test(value)) continue
      try {
        const url = new URL(value)
        if (url.protocol === "http:" || url.protocol === "https:") urls.add(url.toString())
      } catch {}
      if (urls.size >= 500) break
    }

    let stored = 0
    for (const url of urls) {
      const parsed = new URL(url)
      const isJS = /\.m?js(?:[?#]|$)/i.test(parsed.pathname) || /javascript|ecmascript/i.test(input.signal ?? "")
      const kind: Kind = isJS ? "javascript" : "endpoint"
      try {
        Database.use((db) => db.insert(TargetMemoryTable).values({
          id: Identifier.ascending("target_memory"),
          project_id: projectID,
          kind,
          asset: parsed.host,
          method: kind === "endpoint" ? "GET" : null,
          url,
          content_type: isJS ? "application/javascript" : null,
          metadata: { source_tool: input.tool, signal: input.signal ?? null, call_id: input.callID ?? null, discovered: true },
          time_created: Date.now(),
          time_updated: Date.now(),
        }).onConflictDoNothing().run())
        stored++
      } catch {}
    }
    return stored
  }

  export function list(projectID: string, kind?: Kind, limit = 200): Info[] {
    const rows = Database.use((db) => {
      const query = db.select().from(TargetMemoryTable).where(
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
      time: { created: r.time_created, updated: r.time_updated },
    }))
  }
}
