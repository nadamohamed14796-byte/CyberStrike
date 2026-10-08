import { and, desc, eq, or, like } from "drizzle-orm"
import { Database } from "../storage/db"
import { Identifier } from "../id/id"
import { ReportKnowledgeEventTable, ReportKnowledgeTable } from "./report-knowledge.sql"

export namespace ReportKnowledge {
  export type Outcome = "observed" | "useful" | "confirmed" | "rejected" | "duplicate" | "disproven"

  function normalize(value?: string | null) {
    return value?.trim().toLowerCase().replace(/\s+/g, " ") || ""
  }

  function fingerprint(input: { title: string; vulnerabilityClass?: string; cweID?: string; endpoint?: string; sourceURL?: string }) {
    return [input.sourceURL, input.vulnerabilityClass, input.cweID, input.endpoint, input.title].map(normalize).filter(Boolean).join("|")
  }

  function confidence(row: typeof ReportKnowledgeTable.$inferSelect, outcome?: Outcome) {
    const useful = row.times_useful + (outcome === "useful" || outcome === "confirmed" ? 1 : 0)
    const rejected = row.times_rejected + (outcome === "rejected" || outcome === "duplicate" || outcome === "disproven" ? 1 : 0)
    const total = useful + rejected
    return total ? Math.max(0, Math.min(100, Math.round((useful / total) * 100))) : row.confidence
  }

  export function ingest(input: {
    sessionID?: string
    vulnerabilityID?: string
    title: string
    vulnerabilityClass?: string
    cweID?: string
    severity: string
    endpoint?: string
    attackVector?: string
    impact?: string
    reproduction?: string
    poc?: string
    sourceKind?: string
    sourceURL?: string
    program?: string
    targetPattern?: string
    outcome?: Outcome
    lesson?: string
    tags?: string[]
    metadata?: Record<string, unknown>
    sourceTrust?: number
  }) {
    try {
      const now = Date.now()
      const key = fingerprint(input)
      if (!key) return null
      return Database.use((db) => {
        const existing = db.select().from(ReportKnowledgeTable).where(eq(ReportKnowledgeTable.fingerprint, key)).get()
        if (existing) {
          db.update(ReportKnowledgeTable).set({
            times_seen: existing.times_seen + 1,
            times_useful: existing.times_useful + (input.outcome === "useful" || input.outcome === "confirmed" ? 1 : 0),
            times_rejected: existing.times_rejected + (input.outcome === "rejected" || input.outcome === "duplicate" || input.outcome === "disproven" ? 1 : 0),
            confidence: confidence(existing, input.outcome),
            status: input.outcome ?? existing.status,
            lesson: input.lesson ?? existing.lesson,
            metadata: input.metadata ?? existing.metadata,
            time_updated: now,
          }).where(eq(ReportKnowledgeTable.id, existing.id)).run()
          return existing.id
        }
        const id = Identifier.ascending("report_knowledge")
        const sourceTrust = Math.max(0, Math.min(100, Math.round(input.sourceTrust ?? 50)))
        const baseConfidence = Math.max(50, sourceTrust)
        db.insert(ReportKnowledgeTable).values({
          id, session_id: input.sessionID ?? null, source_vulnerability_id: input.vulnerabilityID ?? null,
          fingerprint: key, title: input.title, vulnerability_class: input.vulnerabilityClass ?? null,
          cwe_id: input.cweID ?? null, severity: input.severity, status: input.outcome ?? "observed",
          source_kind: input.sourceKind ?? "finding", source_url: input.sourceURL ?? null, program: input.program ?? null,
          target_pattern: input.targetPattern ?? null, endpoint: input.endpoint ?? null, attack_vector: input.attackVector ?? null,
          impact: input.impact ?? null, reproduction: input.reproduction ?? null, poc: input.poc ?? null,
          outcome: input.outcome ?? null, lesson: input.lesson ?? null, tags: input.tags ?? [], metadata: input.metadata ?? {},
          confidence: input.outcome === "confirmed" || input.outcome === "useful" ? baseConfidence : Math.min(baseConfidence, 60),
          times_seen: 1, times_useful: input.outcome === "confirmed" || input.outcome === "useful" ? 1 : 0,
          times_rejected: 0, time_created: now, time_updated: now,
        }).run()
        return id
      })
    } catch (error) {
      console.warn("[cyberstrike] report knowledge persistence failed:", error)
      return null
    }
  }

  export function ingestExternal(input: {
    title: string
    severity: string
    vulnerabilityClass?: string
    cweID?: string
    sourceURL: string
    program?: string
    targetPattern?: string
    endpoint?: string
    attackVector?: string
    impact?: string
    reproduction?: string
    poc?: string
    lesson?: string
    tags?: string[]
    metadata?: Record<string, unknown>
    sourceTrust?: number
  }) {
    return ingest({
      ...input,
      sourceKind: "external_report",
      outcome: "observed",
      sourceTrust: input.sourceTrust,
    })
  }

  export function recordOutcome(input: {
    reportID: string
    sessionID?: string
    outcome: Outcome
    signal?: string
    evidence?: string
    hook?: string
    metadata?: Record<string, unknown>
  }) {
    try {
      Database.use((db) => {
        const row = db.select().from(ReportKnowledgeTable).where(eq(ReportKnowledgeTable.id, input.reportID)).get()
        if (!row) return
        const now = Date.now()
        db.update(ReportKnowledgeTable).set({
          status: input.outcome, outcome: input.outcome,
          times_useful: row.times_useful + (input.outcome === "useful" || input.outcome === "confirmed" ? 1 : 0),
          times_rejected: row.times_rejected + (input.outcome === "rejected" || input.outcome === "duplicate" || input.outcome === "disproven" ? 1 : 0),
          confidence: confidence(row, input.outcome), time_updated: now,
        }).where(eq(ReportKnowledgeTable.id, input.reportID)).run()
        db.insert(ReportKnowledgeEventTable).values({
          id: Identifier.ascending("report_knowledge_event"), report_id: input.reportID,
          session_id: input.sessionID ?? row.session_id, hook: input.hook ?? "learning",
          outcome: input.outcome, signal: input.signal ?? null, evidence: input.evidence ?? null,
          metadata: input.metadata ?? {}, time_created: now, time_updated: now,
        }).run()
      })
    } catch (error) {
      console.warn("[cyberstrike] report knowledge outcome persistence failed:", error)
    }
  }

  export function search(input: { query?: string; vulnerabilityClass?: string; cweID?: string; targetPattern?: string; limit?: number } = {}) {
    try {
      return Database.use((db) => {
        const conditions = []
        if (input.vulnerabilityClass) conditions.push(eq(ReportKnowledgeTable.vulnerability_class, normalize(input.vulnerabilityClass)))
        if (input.cweID) conditions.push(eq(ReportKnowledgeTable.cwe_id, input.cweID))
        if (input.targetPattern) conditions.push(eq(ReportKnowledgeTable.target_pattern, normalize(input.targetPattern)))
        if (input.query) {
          const q = `%${normalize(input.query)}%`
          conditions.push(or(like(ReportKnowledgeTable.title, q), like(ReportKnowledgeTable.lesson, q), like(ReportKnowledgeTable.attack_vector, q), like(ReportKnowledgeTable.impact, q)))
        }
        const query = db.select().from(ReportKnowledgeTable)
        return (conditions.length ? query.where(and(...conditions)) : query)
          .orderBy(desc(ReportKnowledgeTable.confidence), desc(ReportKnowledgeTable.times_useful), desc(ReportKnowledgeTable.time_updated))
          .limit(Math.min(input.limit ?? 20, 100)).all()
      })
    } catch { return [] }
  }

  export function recommendations(input: { signal?: string; vulnerabilityClass?: string; cweID?: string; limit?: number } = {}) {
    return search({ query: input.signal, vulnerabilityClass: input.vulnerabilityClass, cweID: input.cweID, limit: input.limit ?? 8 })
      .filter((row) => row.confidence >= 50)
  }
}
