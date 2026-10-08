import { describe, expect, test } from "bun:test"
import { ReportKnowledge } from "../../src/learning/report-knowledge"
import { Learning } from "../../src/learning/learning"

describe("ReportKnowledge", () => {
  test("ingests and retrieves a normalized report knowledge record", () => {
    const id = ReportKnowledge.ingest({
      title: "IDOR exposes another user's invoice",
      vulnerabilityClass: "idor",
      cweID: "CWE-639",
      severity: "high",
      endpoint: "/api/invoices/:id",
      impact: "Cross-account access",
      reproduction: "Change the invoice identifier",
      outcome: "confirmed",
      lesson: "Always compare object ownership across two accounts.",
      tags: ["idor", "authorization"],
    })
    expect(id).toBeTruthy()
    const rows = ReportKnowledge.search({ vulnerabilityClass: "idor", cweID: "CWE-639", limit: 10 })
    expect(rows.some((row) => row.id === id)).toBe(true)
    const recommendations = ReportKnowledge.recommendations({ signal: "ownership" })
    expect(recommendations.some((row) => row.id === id)).toBe(true)

    const multiWordSearch = ReportKnowledge.search({ query: "IDOR authorization", limit: 10 })
    expect(multiWordSearch.some((row) => row.id === id)).toBe(true)

    const multiWordRecommendations = ReportKnowledge.recommendations({ signal: "IDOR user authorization", limit: 10 })
    expect(multiWordRecommendations.some((row) => row.id === id)).toBe(true)
  })

  test("primes a fresh hunt session with persisted public research", () => {
    const id = ReportKnowledge.ingestExternal({
      title: "Fresh hunt research hydration test",
      vulnerabilityClass: "idor",
      severity: "high",
      sourceURL: "https://example.com/research/fresh-hunt-hydration-test",
      lesson: "Compare ownership across independent accounts.",
      sourceTrust: 90,
    })
    expect(id).toBeTruthy()

    const sessionID = "session-research-hydration-test"
    const recommendations = Learning.primeResearch(sessionID, 6)

    expect(recommendations.some((row) => row.id === id)).toBe(true)
    expect(Learning.researchFor(sessionID, 6).some((row) => row.id === id)).toBe(true)
  })

  test("keeps research explicitly activated by an update across prompt hydration", () => {
    const id = ReportKnowledge.ingestExternal({
      title: "Explicit update research context retention",
      vulnerabilityClass: "idor",
      severity: "high",
      sourceURL: "https://example.com/research/update-context-retention",
      lesson: "Compare object ownership across two independent accounts.",
      sourceTrust: 95,
    })
    expect(id).toBeTruthy()

    const sessionID = "session-research-update-retention-test"
    const activated = Learning.activateResearch(sessionID, {
      query: "update context retention",
      limit: 6,
    })
    expect(activated.some((row) => row.id === id)).toBe(true)

    const rehydrated = Learning.primeResearch(sessionID, 6, {
      query: "query-with-no-matching-research-token-9f2c",
    })
    expect(rehydrated.some((row) => row.id === id)).toBe(true)
  })

  test("records rejected outcomes without deleting knowledge", () => {
    const id = ReportKnowledge.ingest({
      title: "Weak CORS reflection",
      vulnerabilityClass: "cors",
      severity: "low",
      endpoint: "/api/profile",
      outcome: "observed",
    })
    expect(id).toBeTruthy()
    ReportKnowledge.recordOutcome({
      reportID: id!,
      outcome: "rejected",
      signal: "false_positive",
      evidence: "No credentialed cross-origin read",
    })
    const rows = ReportKnowledge.search({ vulnerabilityClass: "cors", limit: 10 })
    const row = rows.find((item) => item.id === id)
    expect(row?.status).toBe("rejected")
    expect(row?.times_rejected).toBeGreaterThanOrEqual(1)
  })
})
