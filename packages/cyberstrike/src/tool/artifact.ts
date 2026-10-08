import { createHash } from "node:crypto"
import { and, desc, eq } from "drizzle-orm"
import { Database } from "../storage/db"
import { Identifier } from "../id/id"
import { ToolArtifactTable } from "./artifact.sql"

export namespace ToolArtifact {
  export type RecordInput = {
    sessionID?: string
    callID?: string
    requestID?: string
    credentialID?: string
    parentID?: string
    tool: string
    target?: string
    phase?: string
    risk?: string
    scopeDecision?: string
    input?: unknown
    output?: unknown
    signal?: string
    resultCount?: number
    metadata?: Record<string, unknown>
  }

  const MAX_OUTPUT = 200_000
  const MAX_PREVIEW = 2_000

  function redactInput(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(redactInput)
    if (!value || typeof value !== "object") return value
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (/authorization|cookie|password|passwd|secret|token|api[_-]?key|private[_-]?key/i.test(key)) {
        out[key] = "[REDACTED]"
      } else {
        out[key] = redactInput(item)
      }
    }
    return out
  }

  function serialize(value: unknown): string {
    if (typeof value === "string") return value
    try {
      return JSON.stringify(value) ?? ""
    } catch {
      return String(value)
    }
  }

  function hash(value: string): string {
    return createHash("sha256").update(value).digest("hex")
  }

  export function record(input: RecordInput): string {
    const output = serialize(input.output)
    const id = Identifier.ascending("tool_artifact")
    const now = Date.now()
    Database.use((db) => {
      db.insert(ToolArtifactTable)
        .values({
          id,
          session_id: input.sessionID,
          call_id: input.callID,
          request_id: input.requestID,
          credential_id: input.credentialID,
          parent_id: input.parentID,
          tool: input.tool,
          target: input.target,
          phase: input.phase,
          risk: input.risk,
          scope_decision: input.scopeDecision,
          input:
            input.input && typeof input.input === "object"
              ? (redactInput(input.input) as Record<string, unknown>)
              : undefined,
          output: output.length <= MAX_OUTPUT ? output : undefined,
          output_preview: output.slice(0, MAX_PREVIEW),
          output_hash: output ? hash(output) : undefined,
          result_count: input.resultCount,
          signal: input.signal,
          metadata: input.metadata,
          time_created: now,
          time_updated: now,
        })
        .run()
    })
    return id
  }

  export function list(sessionID: string, limit = 100) {
    return Database.use((db) =>
      db
        .select()
        .from(ToolArtifactTable)
        .where(eq(ToolArtifactTable.session_id, sessionID))
        .orderBy(desc(ToolArtifactTable.time_created))
        .limit(limit)
        .all(),
    )
  }

  export function byRequest(sessionID: string, requestID: string) {
    return Database.use((db) =>
      db
        .select()
        .from(ToolArtifactTable)
        .where(and(eq(ToolArtifactTable.session_id, sessionID), eq(ToolArtifactTable.request_id, requestID)))
        .orderBy(desc(ToolArtifactTable.time_created))
        .all(),
    )
  }

  export function byCall(sessionID: string, callID: string) {
    return Database.use((db) =>
      db
        .select()
        .from(ToolArtifactTable)
        .where(and(eq(ToolArtifactTable.session_id, sessionID), eq(ToolArtifactTable.call_id, callID)))
        .orderBy(desc(ToolArtifactTable.time_created))
        .limit(1)
        .get(),
    )
  }
}
