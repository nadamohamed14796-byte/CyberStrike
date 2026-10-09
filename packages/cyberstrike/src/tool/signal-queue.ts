import { and, asc, desc, eq, sql } from "drizzle-orm"
import { Database } from "../storage/db"
import { Identifier } from "../id/id"
import { SignalQueueTable } from "./signal-queue.sql"
import { ReconDispatch } from "./recon-dispatch"
import { normalizeSignal, type SignalPhase } from "./signal-normalizer"
import { ToolArtifact } from "./artifact"

export namespace SignalQueue {
  export type Status = "pending" | "running" | "completed" | "skipped" | "failed"

  function dedupKey(input: { signal: string; target?: string }) {
    return input.signal.trim().toLowerCase() + "::" + (input.target ?? "*").trim().toLowerCase()
  }

  function priority(signal: string) {
    const s = signal.toLowerCase()
    if (/auth|idor|access|ssrf|sqli|rce|command/.test(s)) return 10
    if (/graphql|api|jwt|cors|xss|reflected|parameter/.test(s)) return 20
    if (/javascript|js|secret|technology|open port/.test(s)) return 30
    if (/http|endpoint|crawl|subdomain|asset/.test(s)) return 40
    return 50
  }

  export function enqueue(input: {
    sessionID?: string
    parentID?: string
    signal: string
    target?: string
    depth?: number
    maxAttempts?: number
    metadata?: Record<string, unknown>
  }) {
    const normalized = normalizeSignal(input.signal)
    const normalizedInput = { ...input, signal: normalized.signal }
    const key = dedupKey(normalizedInput)
    const sessionID = input.sessionID
    return Database.transaction((db) => {
      const existing = sessionID
        ? db
            .select()
            .from(SignalQueueTable)
            .where(and(eq(SignalQueueTable.session_id, sessionID), eq(SignalQueueTable.dedup_key, key)))
            .limit(1)
            .get()
        : undefined
      if (existing) return existing.id

      const id = Identifier.ascending("signal_queue")
      const now = Date.now()
      try {
        db.insert(SignalQueueTable)
          .values({
            id,
            session_id: input.sessionID ?? null,
            parent_id: input.parentID,
            signal: normalized.signal,
            target: input.target,
            depth: Math.max(0, input.depth ?? 0),
            attempts: 0,
            max_attempts: Math.max(1, Math.min(20, input.maxAttempts ?? 1)),
            priority: Math.min(priority(normalized.signal), normalized.priority),
            status: "pending",
            dedup_key: key,
            metadata: input.metadata,
            time_created: now,
            time_updated: now,
          })
          .run()
      } catch (error) {
        // Another worker may have won the same unique (session, dedup_key)
        // race. Return its id instead of surfacing a false tool failure.
        if (sessionID) {
          const winner = db
            .select({ id: SignalQueueTable.id })
            .from(SignalQueueTable)
            .where(and(eq(SignalQueueTable.session_id, sessionID), eq(SignalQueueTable.dedup_key, key)))
            .limit(1)
            .get()
          if (winner) return winner.id
        }
        throw error
      }
      return id
    })
  }

  export function get(id: string) {
    return Database.use((db) => db.select().from(SignalQueueTable).where(eq(SignalQueueTable.id, id)).limit(1).get())
  }

  function phaseFor(signal: string): SignalPhase {
    return normalizeSignal(signal).phase
  }

  export function matrix(sessionID: string, limit = 1000) {
    const artifacts = ToolArtifact.list(sessionID, limit)
    const seen = new Set<string>()
    for (const artifact of artifacts) {
      const target = (artifact.target ?? "*").trim().toLowerCase()
      const phase = artifact.phase ?? normalizeSignal(artifact.signal ?? "").phase
      const signal = (artifact.signal ?? "").trim().toLowerCase() || "*"
      seen.add(target + "::" + phase + "::" + signal + "::" + artifact.tool)
    }
    const queue = list(sessionID, limit)
    for (const item of queue) {
      const target = (item.target ?? "*").trim().toLowerCase()
      const phase = phaseFor(item.signal)
      const signal = item.signal.trim().toLowerCase()
      const key = target + "::" + phase + "::" + signal
      if (item.status === "completed") seen.add(key + "::*")
    }
    return {
      entries: Array.from(seen),
      targets: new Set(Array.from(seen).map((x) => x.split("::")[0])).size,
      total: seen.size,
    }
  }

  export function alreadyCovered(input: { sessionID: string; target?: string; signal: string; toolID?: string }) {
    const target = (input.target ?? "*").trim().toLowerCase()
    const normalized = normalizeSignal(input.signal)
    const artifacts = ToolArtifact.list(input.sessionID, 1000)
    return artifacts.some((artifact) => {
      const artifactTarget = (artifact.target ?? "*").trim().toLowerCase()
      if (artifactTarget !== target) return false
      if (normalizeSignal(artifact.signal ?? "").signal !== normalized.signal) return false
      return !input.toolID || artifact.tool === input.toolID
    })
  }

  export function coverage(sessionID: string) {
    const rows = list(sessionID, 500)
    const phases = new Set<SignalPhase>()
    for (const row of rows) {
      if (row.status === "completed") phases.add(phaseFor(row.signal))
    }
    return {
      phases: Array.from(phases),
      completed: rows.filter((x) => x.status === "completed").length,
      pending: rows.filter((x) => x.status === "pending").length,
      running: rows.filter((x) => x.status === "running").length,
    }
  }

  export function next(sessionID: string) {
    const rows = Database.use((db) =>
      db
        .select()
        .from(SignalQueueTable)
        .where(and(eq(SignalQueueTable.session_id, sessionID), eq(SignalQueueTable.status, "pending")))
        .orderBy(asc(SignalQueueTable.priority), desc(SignalQueueTable.time_created))
        .limit(100)
        .all(),
    )
    if (!rows.length) return undefined
    const completed = new Set(
      Database.use((db) =>
        db
          .select()
          .from(SignalQueueTable)
          .where(and(eq(SignalQueueTable.session_id, sessionID), eq(SignalQueueTable.status, "completed")))
          .limit(500)
          .all(),
      ).map(
        (x) => `${(x.target ?? "*").trim().toLowerCase()}::${phaseFor(x.signal)}::${normalizeSignal(x.signal).signal}`,
      ),
    )
    const uncovered = rows.filter(
      (x) =>
        !completed.has(
          `${(x.target ?? "*").trim().toLowerCase()}::${phaseFor(x.signal)}::${normalizeSignal(x.signal).signal}`,
        ),
    )
    // Covered pending rows can exist after legacy/partial state repair.
    // Do not fall back to one of them: that would re-surface work that is already
    // complete and can drive an autonomous subagent loop indefinitely.
    return uncovered[0]
  }

  export function planNext(input: {
    sessionID: string
    scope_items?: string[]
    scope_verified?: boolean
    authorized_active_testing?: boolean
    max_tools?: number
  }) {
    const queue = next(input.sessionID)
    if (!queue) return undefined
    const tools = ReconDispatch.next({
      sessionID: input.sessionID,
      signal: queue.signal,
      target: queue.target ?? undefined,
      scope_items: input.scope_items,
      scope_verified: input.scope_verified,
      authorized_active_testing: input.authorized_active_testing,
      max_tools: input.max_tools,
    })
    return { queue, tools }
  }

  export function claimForTool(input: {
    sessionID: string
    toolID: string
    target?: string
    scope_items?: string[]
    scope_verified?: boolean
    authorized_active_testing?: boolean
  }) {
    const item = next(input.sessionID)
    if (!item) return undefined
    if (item.target && input.target && item.target !== input.target) return undefined

    const plan = ReconDispatch.next({
      sessionID: input.sessionID,
      signal: item.signal,
      target: item.target ?? input.target,
      scope_items: input.scope_items,
      scope_verified: input.scope_verified,
      authorized_active_testing: input.authorized_active_testing,
    })
    if (!plan.some((tool) => tool.id === input.toolID)) return undefined
    return markRunning(item.id) ? item.id : undefined
  }

  /**
   * Recover queue work left in "running" state after a process/session crash.
   * Fresh work is left alone; stale work is re-queued only when another attempt
   * is still available, otherwise it becomes terminally failed.
   */
  export function recover(sessionID: string, staleMs = 60_000) {
    const cutoff = Date.now() - Math.max(0, staleMs)
    return Database.transaction((db) => {
      const stale = db
        .select({
          id: SignalQueueTable.id,
          attempts: SignalQueueTable.attempts,
          max_attempts: SignalQueueTable.max_attempts,
        })
        .from(SignalQueueTable)
        .where(
          and(
            eq(SignalQueueTable.session_id, sessionID),
            eq(SignalQueueTable.status, "running"),
            sql`time_updated <= ${cutoff}`,
          ),
        )
        .all()

      let requeued = 0
      let failed = 0
      for (const row of stale) {
        const nextStatus = row.attempts < row.max_attempts ? "pending" : "failed"
        db.update(SignalQueueTable)
          .set({ status: nextStatus, time_updated: Date.now() })
          .where(and(eq(SignalQueueTable.id, row.id), eq(SignalQueueTable.status, "running")))
          .run()
        if (nextStatus === "pending") requeued++
        else failed++
      }
      return { recovered: stale.length, requeued, failed }
    })
  }

  export function markRunning(id: string): boolean {
    return Database.use((db) => {
      const row = db
        .update(SignalQueueTable)
        .set({ status: "running", attempts: sql`attempts + 1`, time_updated: Date.now() })
        .where(and(eq(SignalQueueTable.id, id), eq(SignalQueueTable.status, "pending"), sql`attempts < max_attempts`))
        .returning({ id: SignalQueueTable.id })
        .get()
      return Boolean(row)
    })
  }

  // State transitions are conditional at the database boundary so late or
  // duplicated callbacks cannot overwrite a terminal result or finalize work
  // that was never claimed by a worker.
  export function complete(id: string) {
    return Database.use((db) =>
      db
        .update(SignalQueueTable)
        .set({ status: "completed", time_updated: Date.now() })
        .where(and(eq(SignalQueueTable.id, id), eq(SignalQueueTable.status, "running")))
        .run(),
    )
  }

  export function skip(id: string) {
    return Database.use((db) =>
      db
        .update(SignalQueueTable)
        .set({ status: "skipped", time_updated: Date.now() })
        .where(and(eq(SignalQueueTable.id, id), eq(SignalQueueTable.status, "pending")))
        .run(),
    )
  }

  export function fail(id: string) {
    return Database.use((db) =>
      db
        .update(SignalQueueTable)
        .set({ status: "failed", time_updated: Date.now() })
        .where(and(eq(SignalQueueTable.id, id), eq(SignalQueueTable.status, "running")))
        .run(),
    )
  }

  export function retry(id: string) {
    return Database.use((db) =>
      db
        .update(SignalQueueTable)
        .set({ status: "pending", time_updated: Date.now() })
        .where(and(eq(SignalQueueTable.id, id), eq(SignalQueueTable.status, "failed"), sql`attempts < max_attempts`))
        .run(),
    )
  }

  export function list(sessionID: string, limit = 100) {
    return Database.use((db) =>
      db
        .select()
        .from(SignalQueueTable)
        .where(eq(SignalQueueTable.session_id, sessionID))
        .orderBy(asc(SignalQueueTable.priority), desc(SignalQueueTable.time_created))
        .limit(limit)
        .all(),
    )
  }
}
