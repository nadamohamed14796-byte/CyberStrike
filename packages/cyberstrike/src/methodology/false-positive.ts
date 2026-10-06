import { and, desc, eq } from "drizzle-orm"
import { createHash } from "node:crypto"
import { Database } from "../storage/db"
import { Identifier } from "../id/id"
import { FalsePositiveTable } from "./methodology.sql"

export namespace FalsePositive {
  export type Match = {
    vulnClass: string
    endpointPattern?: string
    assetPattern?: string
    reason: string
    confidence: number
    hitCount: number
    fingerprint: string
  }

  function normalize(value?: string) {
    return (value ?? "").toLowerCase().replace(/\\s+/g, " ").trim()
  }

  function fingerprint(input: { vulnClass: string; endpointPattern?: string; assetPattern?: string; reason: string }) {
    return createHash("sha256")
      .update([normalize(input.vulnClass), normalize(input.endpointPattern), normalize(input.assetPattern), normalize(input.reason)].join("\\n"))
      .digest("hex")
      .slice(0, 32)
  }

  export function remember(input: {
    sessionID: string
    vulnClass: string
    endpointPattern?: string
    assetPattern?: string
    reason: string
    evidence?: Record<string, unknown>
    sourceFindingID?: string
    confidence?: number
  }) {
    const fp = fingerprint(input)
    const now = Date.now()
    const existing = Database.use((db) =>
      db.select().from(FalsePositiveTable)
        .where(and(eq(FalsePositiveTable.session_id, input.sessionID), eq(FalsePositiveTable.fingerprint, fp)))
        .get(),
    )
    if (existing) {
      Database.use((db) => db.update(FalsePositiveTable).set({
        hit_count: existing.hit_count + 1,
        confidence: Math.max(existing.confidence, input.confidence ?? existing.confidence),
        evidence: input.evidence ?? existing.evidence,
        last_seen_at: now,
        time_updated: now,
      }).where(eq(FalsePositiveTable.id, existing.id)).run())
      return existing.id
    }
    const id = Identifier.ascending("false_positive")
    Database.use((db) => db.insert(FalsePositiveTable).values({
      id,
      session_id: input.sessionID,
      fingerprint: fp,
      vuln_class: input.vulnClass,
      endpoint_pattern: input.endpointPattern ?? null,
      asset_pattern: input.assetPattern ?? null,
      reason: input.reason,
      evidence: input.evidence ?? null,
      source_finding_id: input.sourceFindingID ?? null,
      confidence: input.confidence ?? 0.8,
      hit_count: 1,
      last_seen_at: now,
      time_created: now,
      time_updated: now,
    }).run())
    return id
  }

  export function matches(sessionID: string, input: {
    vulnClass: string
    endpoint?: string
    asset?: string
  }): Match[] {
    const cls = normalize(input.vulnClass)
    const endpoint = normalize(input.endpoint)
    const asset = normalize(input.asset)
    return Database.use((db) => db.select().from(FalsePositiveTable)
      .where(and(eq(FalsePositiveTable.session_id, sessionID), eq(FalsePositiveTable.vuln_class, cls)))
      .orderBy(desc(FalsePositiveTable.confidence), desc(FalsePositiveTable.hit_count))
      .all())
      .filter((row) => {
        const endpointMatch = !row.endpoint_pattern || !endpoint || endpoint.includes(normalize(row.endpoint_pattern))
        const assetMatch = !row.asset_pattern || !asset || asset.includes(normalize(row.asset_pattern))
        return endpointMatch && assetMatch
      })
      .map((row) => ({
        vulnClass: row.vuln_class,
        endpointPattern: row.endpoint_pattern ?? undefined,
        assetPattern: row.asset_pattern ?? undefined,
        reason: row.reason,
        confidence: row.confidence,
        hitCount: row.hit_count,
        fingerprint: row.fingerprint,
      }))
  }

  export function list(sessionID: string, limit = 100) {
    return Database.use((db) => db.select().from(FalsePositiveTable)
      .where(eq(FalsePositiveTable.session_id, sessionID))
      .orderBy(desc(FalsePositiveTable.last_seen_at))
      .limit(limit).all())
  }
}
