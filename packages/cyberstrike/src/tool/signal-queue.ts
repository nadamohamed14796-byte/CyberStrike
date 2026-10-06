import { and, asc, desc, eq, sql } from "drizzle-orm"
import { Database } from "../storage/db"
import { Identifier } from "../id/id"
import { SignalQueueTable } from "./signal-queue.sql"
import { ReconDispatch } from "./recon-dispatch"

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
    const key = dedupKey(input)
    const existing = input.sessionID
      ? Database.use((db) => db.select().from(SignalQueueTable)
          .where(and(eq(SignalQueueTable.session_id, input.sessionID), eq(SignalQueueTable.dedup_key, key)))
          .limit(1).get())
      : undefined
    if (existing) return existing.id

    const id = Identifier.ascending("signal_queue")
    const now = Date.now()
    Database.use((db) => db.insert(SignalQueueTable).values({
      id,
      session_id: input.sessionID,
      parent_id: input.parentID,
      signal: input.signal,
      target: input.target,
      depth: Math.max(0, input.depth ?? 0),
      attempts: 0,
      max_attempts: Math.max(1, Math.min(20, input.maxAttempts ?? 1)),
      priority: priority(input.signal),
      status: "pending",
      dedup_key: key,
      metadata: input.metadata,
      time_created: now,
      time_updated: now,
    }).run())
    return id
  }

  export function get(id: string) {
    return Database.use((db) => db.select().from(SignalQueueTable)
      .where(eq(SignalQueueTable.id, id)).limit(1).get())
  }

  export function next(sessionID: string) {
    return Database.use((db) => db.select().from(SignalQueueTable)
      .where(and(eq(SignalQueueTable.session_id, sessionID), eq(SignalQueueTable.status, "pending")))
      .orderBy(asc(SignalQueueTable.priority), desc(SignalQueueTable.time_created))
      .limit(1).get())
  }

  export function markRunning(id: string) {
    return Database.use((db) => db.update(SignalQueueTable)
      .set({ status: "running", attempts: sql`attempts + 1`, time_updated: Date.now() })
      .where(and(eq(SignalQueueTable.id, id), eq(SignalQueueTable.status, "pending"))).run())
  }

  export function complete(id: string) {
    return Database.use((db) => db.update(SignalQueueTable)
      .set({ status: "completed", time_updated: Date.now() })
      .where(eq(SignalQueueTable.id, id)).run())
  }

  export function skip(id: string) {
    return Database.use((db) => db.update(SignalQueueTable)
      .set({ status: "skipped", time_updated: Date.now() })
      .where(eq(SignalQueueTable.id, id)).run())
  }

  export function fail(id: string) {
    return Database.use((db) => db.update(SignalQueueTable)
      .set({ status: "failed", time_updated: Date.now() })
      .where(eq(SignalQueueTable.id, id)).run())
  }

  export function retry(id: string) {
    return Database.use((db) => db.update(SignalQueueTable)
      .set({ status: "pending", time_updated: Date.now() })
      .where(and(
        eq(SignalQueueTable.id, id),
        eq(SignalQueueTable.status, "failed"),
        sql`attempts < max_attempts`,
      )).run())
  }

  export function list(sessionID: string, limit = 100) {
    return Database.use((db) => db.select().from(SignalQueueTable)
      .where(eq(SignalQueueTable.session_id, sessionID))
      .orderBy(asc(SignalQueueTable.priority), desc(SignalQueueTable.time_created))
      .limit(limit).all())
  }
}
