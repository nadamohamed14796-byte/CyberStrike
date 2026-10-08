import { createHash } from "node:crypto"
import { and, desc, eq, inArray } from "drizzle-orm"
import { Database } from "../storage/db"
import { Identifier } from "../id/id"
import { ToolRunRecordTable } from "./run-record.sql"

export type ToolRunStatus = "pending" | "running" | "completed" | "failed" | "timed_out" | "cancelled"

export type ToolRunInput = {
  sessionID: string
  toolID: string
  toolName?: string
  target?: string
  endpoint?: string
  parameters?: Record<string, unknown>
  parentTaskID?: string
  signalQueueID?: string
  callID?: string
  timeoutMs?: number
  maxAttempts?: number
  scopeVerified?: boolean
  agent?: string
  metadata?: Record<string, unknown>
}

function stable(value: unknown): string {
  if (value === undefined) return "null"
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]"
  return (
    "{" +
    Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + stable((value as Record<string, unknown>)[key]))
      .join(",") +
    "}"
  )
}

export function normalizeTarget(value?: string): string {
  if (!value) return ""
  const raw = value.trim()
  try {
    const url = new URL(raw)
    url.hash = ""
    url.hostname = url.hostname.toLowerCase()
    if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443"))
      url.port = ""
    url.pathname = url.pathname || "/"
    return url.toString()
  } catch {
    return raw.toLowerCase().replace(/\/$/, "")
  }
}

export function normalizeEndpoint(value?: string): string {
  if (!value) return ""
  const raw = value.trim()
  try {
    const url = new URL(raw)
    url.hash = ""
    url.hostname = url.hostname.toLowerCase()
    if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443"))
      url.port = ""
    return url.toString()
  } catch {
    return raw.replace(/\s+/g, " ").toLowerCase()
  }
}

export function toolRunKey(input: {
  toolID: string
  target?: string
  endpoint?: string
  parameters?: Record<string, unknown>
  context?: Record<string, unknown>
}): string {
  const payload = [
    input.toolID.trim().toLowerCase(),
    normalizeTarget(input.target),
    normalizeEndpoint(input.endpoint),
    stable(input.parameters ?? {}),
    stable(input.context ?? {}),
  ].join(":")
  return createHash("sha256").update(payload).digest("hex")
}

function terminal(status: ToolRunStatus) {
  return status === "completed" || status === "failed" || status === "timed_out" || status === "cancelled"
}

const MAX_PERSISTED_OUTPUT = 200_000

export namespace ToolRunRecord {
  export function begin(input: ToolRunInput) {
    const now = Date.now()
    const runKey = toolRunKey({
      toolID: input.toolID,
      target: input.target,
      endpoint: input.endpoint,
      parameters: input.parameters,
      context: { agent: input.agent, scopeVerified: input.scopeVerified === true },
    })

    return Database.transaction((db) => {
      const existing = db
        .select()
        .from(ToolRunRecordTable)
        .where(and(eq(ToolRunRecordTable.session_id, input.sessionID), eq(ToolRunRecordTable.run_key, runKey)))
        .orderBy(desc(ToolRunRecordTable.time_created))
        .limit(1)
        .get()

      if (existing && !terminal(existing.status as ToolRunStatus)) {
        return { id: existing.id, runKey, attempt: existing.attempt, deduplicated: true }
      }

      const attempt = (existing?.attempt ?? 0) + 1
      const id = Identifier.ascending("tool_run")
      db.insert(ToolRunRecordTable)
        .values({
          id,
          run_key: runKey,
          session_id: input.sessionID,
          parent_task_id: input.parentTaskID,
          signal_queue_id: input.signalQueueID,
          call_id: input.callID,
          tool_id: input.toolID,
          tool_name: input.toolName,
          target: input.target ? normalizeTarget(input.target) : undefined,
          endpoint: input.endpoint ? normalizeEndpoint(input.endpoint) : undefined,
          parameters: input.parameters,
          status: "running",
          attempt,
          max_attempts: Math.max(1, input.maxAttempts ?? 1),
          timeout_ms: input.timeoutMs,
          time_pending: now,
          time_started: now,
          scope_verified: input.scopeVerified === undefined ? undefined : input.scopeVerified ? 1 : 0,
          agent: input.agent,
          metadata: input.metadata,
          time_created: now,
          time_updated: now,
        })
        .run()
      return { id, runKey, attempt, deduplicated: false }
    })
  }

  export function finish(input: {
    id: string
    status: Exclude<ToolRunStatus, "pending" | "running">
    exitCode?: number
    stdout?: string
    stderr?: string
    resultSummary?: string
    error?: string
    metadata?: Record<string, unknown>
  }) {
    const ended = Date.now()
    Database.use((db) => {
      const row = db
        .select({
          started: ToolRunRecordTable.time_started,
          metadata: ToolRunRecordTable.metadata,
        })
        .from(ToolRunRecordTable)
        .where(eq(ToolRunRecordTable.id, input.id))
        .limit(1)
        .get()
      const previousMetadata = (row?.metadata as Record<string, unknown> | null) ?? {}
      db.update(ToolRunRecordTable)
        .set({
          status: input.status,
          exit_code: input.exitCode,
          stdout: input.stdout?.slice(0, MAX_PERSISTED_OUTPUT),
          stderr: input.stderr?.slice(0, MAX_PERSISTED_OUTPUT),
          result_summary: input.resultSummary?.slice(0, MAX_PERSISTED_OUTPUT),
          error: input.error,
          metadata: { ...previousMetadata, ...(input.metadata ?? {}) },
          time_ended: ended,
          duration_ms: row?.started ? Math.max(0, ended - row.started) : undefined,
          time_updated: ended,
        })
        .where(eq(ToolRunRecordTable.id, input.id))
        .run()
    })
  }

  export function recover(sessionID: string, reason = "session recovery", staleMs = 60_000) {
    const cutoff = Date.now() - Math.max(0, staleMs)
    const unfinishedRuns = unfinished(sessionID).filter((run) => (run.time_started ?? run.time_created) <= cutoff)
    for (const run of unfinishedRuns) {
      finish({
        id: run.id,
        status: "cancelled",
        error: reason,
        metadata: { recovered: true, previous_status: run.status },
      })
    }
    return unfinishedRuns.length
  }

  export function get(id: string) {
    return Database.use((db) =>
      db.select().from(ToolRunRecordTable).where(eq(ToolRunRecordTable.id, id)).limit(1).get(),
    )
  }

  export function recent(sessionID: string, limit = 50) {
    return Database.use((db) =>
      db
        .select()
        .from(ToolRunRecordTable)
        .where(eq(ToolRunRecordTable.session_id, sessionID))
        .orderBy(desc(ToolRunRecordTable.time_created))
        .limit(limit)
        .all(),
    )
  }

  export function unfinished(sessionID: string) {
    return Database.use((db) =>
      db
        .select()
        .from(ToolRunRecordTable)
        .where(
          and(eq(ToolRunRecordTable.session_id, sessionID), inArray(ToolRunRecordTable.status, ["pending", "running"])),
        )
        .orderBy(desc(ToolRunRecordTable.time_created))
        .all(),
    )
  }
}
