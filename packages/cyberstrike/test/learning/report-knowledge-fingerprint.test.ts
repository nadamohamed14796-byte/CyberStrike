import { expect, test } from "bun:test"
import { ReportKnowledge } from "../../src/learning/report-knowledge"
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
    targetPattern: "alpha.example",
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

  expect(alpha.map((row) => row.id)).toEqual([first])
  expect(beta.map((row) => row.id)).toEqual([second])
})
