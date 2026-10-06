import { and, eq, gt } from "drizzle-orm"
import { Database } from "../storage/db"
import { Identifier } from "../id/id"
import { MissionClaimTable } from "./methodology.sql"

export namespace MissionClaims {
  export function claim(input: { sessionID: string; cellKey: string; agent: string; ttlMs?: number }) {
    const now = Date.now()
    const expires = now + Math.max(5_000, Math.min(input.ttlMs ?? 120_000, 3_600_000))
    const existing = Database.use((db) => db.select().from(MissionClaimTable)
      .where(and(eq(MissionClaimTable.session_id, input.sessionID), eq(MissionClaimTable.cell_key, input.cellKey)))
      .get())
    if (existing && existing.status === "active" && existing.expires_at > now && existing.agent !== input.agent) {
      return { claimed: false, owner: existing.agent, expiresAt: existing.expires_at }
    }
    const id = existing?.id ?? Identifier.ascending("mission_claim")
    Database.use((db) => {
      if (existing) {
        db.update(MissionClaimTable).set({
          agent: input.agent, status: "active", expires_at: expires, time_updated: now,
        }).where(eq(MissionClaimTable.id, existing.id)).run()
      } else {
        db.insert(MissionClaimTable).values({
          id, session_id: input.sessionID, cell_key: input.cellKey, agent: input.agent,
          status: "active", expires_at: expires, time_created: now, time_updated: now,
        }).run()
      }
    })
    return { claimed: true, owner: input.agent, expiresAt: expires }
  }

  export function release(sessionID: string, cellKey: string, agent: string, resultFingerprint?: string) {
    Database.use((db) => db.update(MissionClaimTable).set({
      status: "completed", result_fingerprint: resultFingerprint ?? null, time_updated: Date.now(),
    }).where(and(
      eq(MissionClaimTable.session_id, sessionID),
      eq(MissionClaimTable.cell_key, cellKey),
      eq(MissionClaimTable.agent, agent),
    )).run())
  }

  export function active(sessionID: string) {
    const now = Date.now()
    return Database.use((db) => db.select().from(MissionClaimTable)
      .where(and(eq(MissionClaimTable.session_id, sessionID), eq(MissionClaimTable.status, "active"), gt(MissionClaimTable.expires_at, now)))
      .all())
  }
}
