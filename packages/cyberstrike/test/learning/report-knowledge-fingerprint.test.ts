import { expect, test } from "bun:test"
import path from "node:path"
import { ReportKnowledge } from "../../src/learning/report-knowledge"
import { ReportKnowledgeTable } from "../../src/learning/report-knowledge.sql"
import { Database } from "../../src/storage/db"
import { createLearningTestSessions } from "./test-session"

test("persists case-sensitive source URLs as distinct records and deduplicates fragments", () => {
  const shared = {
    severity: "medium",
    vulnerabilityClass: "idor",
    lesson: "Validate object-level authorization with an independent account.",
    sourceTrust: 80,
    tags: ["learning-audit"],
  }

  const upper = ReportKnowledge.ingestExternalDetailed({
    ...shared,
    title: "Synthetic uppercase-path research record",
    sourceURL: "https://research.example/learning-audit/User/Profile?id=AbC",
  })
  const lower = ReportKnowledge.ingestExternalDetailed({
    ...shared,
    title: "Synthetic lowercase-path research record",
    sourceURL: "https://research.example/learning-audit/user/profile?id=abc",
  })

  expect(upper).not.toBeNull()
  expect(lower).not.toBeNull()
  expect(upper?.id).not.toBe(lower?.id)
  expect(upper?.created).toBe(true)
  expect(lower?.created).toBe(true)

  const sameUpperWithoutFragment = ReportKnowledge.ingestExternalDetailed({
    ...shared,
    title: "Same uppercase-path resource",
    sourceURL: "https://research.example/learning-audit/User/Profile?id=AbC#example",
  })

  expect(sameUpperWithoutFragment?.id).toBe(upper?.id)
  expect(sameUpperWithoutFragment?.created).toBe(false)
})

test("recommendations preserve relevance and label low-trust imports as advisory", () => {
  const shared = {
    severity: "medium",
    vulnerabilityClass: "idor",
    sourceTrust: 90,
    lesson: "Validate object-level authorization independently.",
  }
  const relevant = ReportKnowledge.ingestExternalDetailed({
    ...shared,
    title: "LessonRankMarker IDOR validation methods",
    sourceURL: "https://research.example/recommendations/LessonRankMarker",
    metadata: { source_trust: 90 },
  })
  const weakMatch = ReportKnowledge.ingestExternalDetailed({
    ...shared,
    title: "General API reference",
    lesson: "LessonRankMarker appears here as a minor example.",
    sourceURL: "https://research.example/recommendations/General",
    metadata: { source_trust: 90 },
  })
  const lowTrust = ReportKnowledge.ingestExternalDetailed({
    ...shared,
    title: "Low-trust external report about object authorization",
    sourceURL: "https://research.example/recommendations/LowTrust",
    lesson: "LessonRankMarker appears in this unverified external reference; validate independently.",
    metadata: { source_trust: 20 },
  })

  expect(relevant).not.toBeNull()
  expect(weakMatch).not.toBeNull()
  expect(lowTrust).not.toBeNull()

  const recommendations = ReportKnowledge.recommendations({
    // Multiple title tokens give the relevant record a strictly stronger
    // relevance score than records matching only the shared marker.
    signal: "LessonRankMarker validation methods",
    vulnerabilityClass: "idor",
    limit: 10,
  })

  expect(recommendations[0]?.id).toBe(relevant!.id)
  expect(recommendations.some((row) => row.id === weakMatch?.id)).toBe(true)
  const advisoryLowTrust = recommendations.find((row) => row.id === lowTrust?.id)
  expect(advisoryLowTrust?.status).toBe("observed")
  expect(advisoryLowTrust?.metadata?.source_trust).toBe(20)
})

test("rolls back outcome score updates when event persistence fails", () => {
  const stored = ReportKnowledge.ingestExternalDetailed({
    title: "OutcomeRollbackMarker IDOR report",
    severity: "medium",
    vulnerabilityClass: "idor",
    sourceURL: "https://research.example/rollback/OutcomeRollbackMarker",
    sourceTrust: 85,
    metadata: { source_trust: 85 },
  })
  expect(stored).not.toBeNull()

  // JSON-backed event metadata must serialize. Deliberately supply a circular
  // value so the event insert fails after the knowledge row update has begun.
  const cyclic: Record<string, unknown> = {}
  cyclic.self = cyclic
  ReportKnowledge.recordOutcome({
    reportID: stored!.id,
    outcome: "confirmed",
    metadata: cyclic,
  })

  const row = ReportKnowledge.search({ query: "OutcomeRollbackMarker", limit: 5 }).find((item) => item.id === stored!.id)
  expect(row?.status).toBe("observed")
  expect(row?.times_useful).toBe(0)
  expect(row?.times_rejected).toBe(0)
})

test("uses one persisted identity for repeated concurrent ingestion attempts", async () => {
  const input = {
    title: "ConcurrentDedupMarker IDOR research",
    severity: "medium",
    vulnerabilityClass: "idor",
    sourceURL: "https://research.example/concurrency/ConcurrentDedupMarker?id=ExactCase",
    sourceTrust: 85,
    lesson: "Validate the object authorization rule using separate test accounts.",
  }

  const results = await Promise.all(
    Array.from({ length: 8 }, () => Promise.resolve().then(() => ReportKnowledge.ingestExternalDetailed(input))),
  )
  const successful = results.filter((result): result is NonNullable<typeof result> => result !== null)

  expect(successful).toHaveLength(8)
  expect(new Set(successful.map((result) => result.id)).size).toBe(1)
  expect(successful.filter((result) => result.created).length).toBe(1)

  const rows = ReportKnowledge.search({ query: "ConcurrentDedupMarker", limit: 10 })
  expect(rows).toHaveLength(1)
  expect(rows[0]?.times_seen).toBe(8)
})

test("runtime recommendations never expose target-specific local findings", () => {
  const sessions = createLearningTestSessions("report-isolation", ["private"])
  const localID = ReportKnowledge.ingest({
    sessionID: sessions.private,
    title: "TargetLeakMarker private.example profile authorization finding",
    vulnerabilityClass: "idor",
    severity: "high",
    endpoint: "https://private.example/api/profile",
    targetPattern: "private.example",
    sourceKind: "finding",
    outcome: "confirmed",
    lesson: "TargetLeakMarker was confirmed only on private.example; do not reuse this target-specific result elsewhere.",
  })

  expect(localID).not.toBeNull()

  // Explicit operator search may inspect its own persisted knowledge.
  expect(ReportKnowledge.search({ query: "TargetLeakMarker", limit: 10 }).some((row) => row.id === localID)).toBe(true)

  // The shared recommender used by hunting prompts must only return reusable
  // public source records, not local reports from another target/session.
  expect(ReportKnowledge.recommendations({ signal: "TargetLeakMarker", limit: 10 }).some((row) => row.id === localID)).toBe(
    false,
  )
})

test("keeps session- and target-scoped external reports out of shared recommendations", () => {
  const sessions = createLearningTestSessions("external-report-isolation", ["private"])
  const shared = {
    vulnerabilityClass: "idor",
    severity: "medium",
    sourceTrust: 90,
    outcome: "observed" as const,
    metadata: { source_trust: 90 },
  }

  const sessionScoped = ReportKnowledge.ingest({
    ...shared,
    sessionID: sessions.private,
    title: "ExternalScopeLeakMarker session-bound article",
    sourceKind: "external_report",
    sourceURL: "https://research.example/external-scope/session-bound",
  })
  const targetScoped = ReportKnowledge.ingest({
    ...shared,
    title: "ExternalScopeLeakMarker target-bound article",
    sourceKind: "external_report",
    sourceURL: "https://research.example/external-scope/target-bound",
    targetPattern: "restricted.example",
  })
  const reusable = ReportKnowledge.ingestExternalDetailed({
    title: "ExternalScopeLeakMarker reusable public reference",
    severity: "medium",
    vulnerabilityClass: "idor",
    sourceURL: "https://research.example/external-scope/reusable",
    sourceTrust: 90,
    metadata: { source_trust: 90 },
  })

  expect(sessionScoped).not.toBeNull()
  expect(targetScoped).not.toBeNull()
  expect(reusable).not.toBeNull()

  const results = ReportKnowledge.search({ query: "ExternalScopeLeakMarker", limit: 10 })
  expect(results.some((row) => row.id === sessionScoped)).toBe(true)
  expect(results.some((row) => row.id === targetScoped)).toBe(true)

  const recommendations = ReportKnowledge.recommendations({ signal: "ExternalScopeLeakMarker", limit: 10 })
  expect(recommendations.some((row) => row.id === sessionScoped)).toBe(false)
  expect(recommendations.some((row) => row.id === targetScoped)).toBe(false)
  expect(recommendations.some((row) => row.id === reusable!.id)).toBe(true)
})

test("keeps equivalent local findings separate across sessions and targets", () => {
  const sessions = createLearningTestSessions("report-scope", ["alpha", "beta"])
  const common = {
    title: "ScopedFingerprintMarker IDOR profile read",
    vulnerabilityClass: "idor",
    severity: "medium",
    endpoint: "/api/profile",
    sourceKind: "finding",
    outcome: "confirmed" as const,
    lesson: "Validate ownership before returning profile data.",
  }

  const first = ReportKnowledge.ingest({
    ...common,
    sessionID: sessions.alpha,
    targetPattern: "ALPHA.EXAMPLE",
  })
  const second = ReportKnowledge.ingest({
    ...common,
    sessionID: sessions.beta,
    targetPattern: "beta.example",
  })

  expect(first).not.toBeNull()
  expect(second).not.toBeNull()
  expect(first).not.toBe(second)

  const alpha = ReportKnowledge.search({ query: "ScopedFingerprintMarker", targetPattern: "alpha.example", limit: 10 })
  const beta = ReportKnowledge.search({ query: "ScopedFingerprintMarker", targetPattern: "beta.example", limit: 10 })

  expect(alpha.map((row) => row.id)).toEqual([first!])
  expect(beta.map((row) => row.id)).toEqual([second!])
})

test("reuses a legacy lowercase URL fingerprint without merging a different URL case", () => {
  const sourceURL = "https://research.example/LegacyCaseSensitive?id=AbC"
  const legacyID = "legacy-report-knowledge-case-compatibility"
  const now = Date.now()

  Database.transaction((db) => {
    db.insert(ReportKnowledgeTable)
      .values({
        id: legacyID,
        fingerprint: "url:" + sourceURL.toLowerCase(),
        title: "LegacyFingerprintCompatibilityMarker IDOR research",
        severity: "medium",
        status: "observed",
        source_kind: "external_report",
        source_url: sourceURL,
        metadata: { source_trust: 90 },
        confidence: 60,
        times_seen: 2,
        times_useful: 0,
        times_rejected: 0,
        time_created: now,
        time_updated: now,
      })
      .run()
  })

  const same = ReportKnowledge.ingestExternalDetailed({
    title: "LegacyFingerprintCompatibilityMarker IDOR research",
    severity: "medium",
    sourceURL,
    sourceTrust: 90,
    metadata: { source_trust: 90 },
  })
  const caseDifferent = ReportKnowledge.ingestExternalDetailed({
    title: "LegacyFingerprintCompatibilityMarker different case research",
    severity: "medium",
    sourceURL: "https://research.example/legacycasesensitive?id=abc",
    sourceTrust: 90,
    metadata: { source_trust: 90 },
  })

  expect(same?.id).toBe(legacyID)
  expect(same?.created).toBe(false)
  expect(caseDifferent?.id).not.toBe(legacyID)
  expect(ReportKnowledge.search({ query: "LegacyFingerprintCompatibilityMarker", limit: 10 }).length).toBe(2)
})

test("rejects blank source titles before creating fingerprinted records", () => {
  const sessions = createLearningTestSessions("blank-title", ["local"])

  const local = ReportKnowledge.ingest({
    sessionID: sessions.local,
    title: "   ",
    severity: "low",
    outcome: "observed",
    endpoint: "/api/profile",
  })
  const external = ReportKnowledge.ingestExternalDetailed({
    title: " ",
    severity: "low",
    sourceURL: "https://research.example/blank-title",
    sourceTrust: 80,
    metadata: { source_trust: 80 },
  })

  expect(local).toBeNull()
  expect(external).toBeNull()
  expect(ReportKnowledge.search({ query: "blank-title", limit: 10 })).toHaveLength(0)
})

test("clamps search and recommendation limits at invalid boundaries", () => {
  const inputs = [
    {
      title: "LimitBoundaryMarker IDOR report one",
      severity: "medium",
      vulnerabilityClass: "idor",
      sourceURL: "https://research.example/limits/one",
      sourceTrust: 80,
      metadata: { source_trust: 80 },
    },
    {
      title: "LimitBoundaryMarker IDOR report two",
      severity: "medium",
      vulnerabilityClass: "idor",
      sourceURL: "https://research.example/limits/two",
      sourceTrust: 80,
      metadata: { source_trust: 80 },
    },
  ]
  for (const input of inputs) expect(ReportKnowledge.ingestExternalDetailed(input)).not.toBeNull()

  expect(ReportKnowledge.search({ query: "LimitBoundaryMarker", limit: -1 })).toHaveLength(0)
  expect(ReportKnowledge.search({ query: "LimitBoundaryMarker", limit: 0 })).toHaveLength(0)
  expect(ReportKnowledge.search({ query: "LimitBoundaryMarker", limit: Number.NaN })).toHaveLength(2)
  expect(ReportKnowledge.search({ query: "LimitBoundaryMarker", limit: Number.POSITIVE_INFINITY })).toHaveLength(2)

  expect(ReportKnowledge.recommendations({ signal: "LimitBoundaryMarker", limit: -1 })).toHaveLength(1)
  expect(ReportKnowledge.recommendations({ signal: "LimitBoundaryMarker", limit: Number.NaN })).toHaveLength(2)
  expect(ReportKnowledge.recommendations({ signal: "LimitBoundaryMarker", limit: Number.POSITIVE_INFINITY })).toHaveLength(2)
})

test("retrieves legacy target patterns regardless of stored casing", () => {
  const sessions = createLearningTestSessions("legacy-target-pattern", ["alpha"])
  const id = "legacy-target-pattern-case-regression"
  const now = Date.now()

  Database.transaction((db) => {
    db.insert(ReportKnowledgeTable)
      .values({
        id,
        session_id: sessions.alpha,
        fingerprint: id,
        title: "LegacyTargetPatternMarker local record",
        severity: "low",
        source_kind: "finding",
        target_pattern: "Alpha.Example",
        time_created: now,
        time_updated: now,
      })
      .run()
  })

  const rows = ReportKnowledge.search({
    query: "LegacyTargetPatternMarker",
    targetPattern: "alpha.example",
    limit: 10,
  })
  expect(rows.map((row) => row.id)).toContain(id)
})

test("a fresh CLI process can retrieve persisted research knowledge", () => {
  const marker = "ProcessRestartPersistenceMarker"
  const stored = ReportKnowledge.ingestExternalDetailed({
    title: marker + " IDOR source record",
    severity: "medium",
    vulnerabilityClass: "idor",
    sourceURL: "https://research.example/process-restart/" + marker,
    sourceTrust: 85,
    lesson: "Verify object authorization independently for every principal.",
    metadata: { source_trust: 85 },
  })
  expect(stored).not.toBeNull()

  const packageRoot = path.resolve(import.meta.dir, "../..")
  // Pass the test preload's isolated XDG/CYBERSTRIKE_TEST_HOME paths explicitly;
  // the child must open the exact same disposable database, not initialize a new one.
  const env = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  )
  const result = Bun.spawnSync(
    ["bun", "run", "src/index.ts", "research", "search", marker],
    { cwd: packageRoot, env },
  )
  const stdout = new TextDecoder().decode(result.stdout)
  const stderr = new TextDecoder().decode(result.stderr)

  if (result.exitCode !== 0) {
    throw new Error(
      "Child CLI exited with " + result.exitCode + "\nstdout:\n" + stdout + "\nstderr:\n" + stderr,
    )
  }
  expect(result.exitCode).toBe(0)
  expect(stdout).toContain(marker)
  expect(stdout).toContain("https://research.example/process-restart/" + marker)
})
