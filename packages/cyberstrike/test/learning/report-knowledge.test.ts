import { describe, expect, test } from "bun:test"
import { ReportKnowledge } from "../../src/learning/report-knowledge"

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
