import { and, desc, eq } from "drizzle-orm"
import { Database } from "../storage/db"
import { Identifier } from "../id/id"
import { ToolLearningEventTable, ToolLearningTable } from "./tool-learning.sql"
import { normalizeSignal } from "../tool/signal-normalizer"

export namespace ToolLearning {
  export type Outcome = "useful" | "finding" | "rejected" | "disproven" | "empty" | "error"

  export function observe(input: {
    sessionID?: string
    tool: string
    signal: string
    target?: string
    outcome: Outcome
    evidence?: string
  }) {
    try {
      const now = Date.now()
      const key = input.tool.trim().toLowerCase()
      const normalizedSignal = normalizeSignal(input.signal).signal
      Database.use((db) => {
        const where = input.sessionID
          ? and(
              eq(ToolLearningTable.session_id, input.sessionID),
              eq(ToolLearningTable.tool, key),
              eq(ToolLearningTable.signal, normalizedSignal),
            )
          : and(eq(ToolLearningTable.tool, key), eq(ToolLearningTable.signal, normalizedSignal))
        const row = db.select().from(ToolLearningTable).where(where).get()
        const success = input.outcome === "useful" || input.outcome === "finding"
        const reject = input.outcome === "rejected" || input.outcome === "disproven" || input.outcome === "empty"
        if (row) {
          const successes = row.successes + (success ? 1 : 0)
          const rejections = row.rejections + (reject ? 1 : 0)
          const usefulness = Math.round((successes / Math.max(1, successes + rejections)) * 100)
          db.update(ToolLearningTable)
            .set({
              observations: row.observations + 1,
              successes,
              rejections,
              usefulness,
              last_outcome: input.outcome,
              last_target: input.target,
              last_evidence: input.evidence,
              time_updated: now,
            })
            .where(eq(ToolLearningTable.id, row.id))
            .run()
        } else {
          db.insert(ToolLearningTable)
            .values({
              id: Identifier.ascending("tool_learning"),
              session_id: input.sessionID,
              tool: key,
              signal: normalizedSignal,
              observations: 1,
              successes: success ? 1 : 0,
              rejections: reject ? 1 : 0,
              usefulness: success ? 100 : 0,
              last_outcome: input.outcome,
              last_target: input.target,
              last_evidence: input.evidence,
              time_created: now,
              time_updated: now,
            })
            .run()
        }
        db.insert(ToolLearningEventTable)
          .values({
            id: Identifier.ascending("tool_learning_event"),
            session_id: input.sessionID,
            tool: key,
            signal: normalizedSignal,
            target: input.target,
            outcome: input.outcome,
            evidence: input.evidence,
            time_created: now,
            time_updated: now,
          })
          .run()
      })
    } catch (error) {
      console.warn("[cyberstrike] tool learning persistence failed:", error)
    }
  }

  export function score(tool: string, signal: string, sessionID?: string) {
    try {
      return Database.use((db) => {
        const key = tool.trim().toLowerCase()
        const normalized = normalizeSignal(signal).signal
        const sessionRows = sessionID
          ? db
              .select()
              .from(ToolLearningTable)
              .where(
                and(
                  eq(ToolLearningTable.session_id, sessionID),
                  eq(ToolLearningTable.tool, key),
                  eq(ToolLearningTable.signal, normalized),
                ),
              )
              .all()
          : []
        const rows = sessionRows.length
          ? sessionRows
          : db
              .select()
              .from(ToolLearningTable)
              .where(and(eq(ToolLearningTable.tool, key), eq(ToolLearningTable.signal, normalized)))
              .all()
        let success = 0
        let reject = 0
        for (const row of rows) {
          success += row.successes
          reject += row.rejections
        }
        return success + reject ? Math.round((success / (success + reject)) * 100) : 50
      })
    } catch {
      return 50
    }
  }

  export function rank<T extends { id: string; risk: string; phase: string }>(
    tools: T[],
    signal: string,
    sessionID?: string,
  ) {
    return tools
      .map((tool) => ({
        ...tool,
        usefulness: score(tool.id, signal, sessionID),
      }))
      .sort((a, b) => b.usefulness - a.usefulness || a.id.localeCompare(b.id))
  }

  export function recent(limit = 30) {
    try {
      return Database.use((db) =>
        db.select().from(ToolLearningEventTable).orderBy(desc(ToolLearningEventTable.time_created)).limit(limit).all(),
      )
    } catch {
      return []
    }
  }
}
