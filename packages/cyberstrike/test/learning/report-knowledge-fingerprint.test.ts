import { expect, test } from "bun:test"
import { ReportKnowledge } from "../../src/learning/report-knowledge"

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
    title: "LessonRankMarker low-trust report",
    sourceURL: "https://research.example/recommendations/LowTrust",
    metadata: { source_trust: 20 },
  })

  expect(relevant).not.toBeNull()
  expect(weakMatch).not.toBeNull()
  expect(lowTrust).not.toBeNull()

  const recommendations = ReportKnowledge.recommendations({
    signal: "LessonRankMarker",
    vulnerabilityClass: "idor",
    limit: 10,
  })

  expect(recommendations[0]?.id).toBe(relevant!.id)
  expect(recommendations.some((row) => row.id === weakMatch?.id)).toBe(true)
  const advisoryLowTrust = recommendations.find((row) => row.id === lowTrust?.id)
  expect(advisoryLowTrust?.status).toBe("observed")
  expect(advisoryLowTrust?.metadata?.source_trust).toBe(20)
})
