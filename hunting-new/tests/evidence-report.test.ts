import { describe, expect, test } from "bun:test"
import { createEvidence, mergeEvidence } from "../src/evidence"
import { buildFinding } from "../src/findings"
import { checkFindingEvidence, markReportable, buildReportMarkdown } from "../src/report-intelligence"

describe("evidence and report intelligence", () => {
  test("deduplicates evidence while preserving strongest confidence", () => {
    const a = createEvidence({ kind: "request", sourceId: "req-1", requestId: "req-1", confidence: .6, details: "request evidence" })
    const b = createEvidence({ kind: "request", sourceId: "req-1", requestId: "req-1", confidence: .9, details: "request evidence" })
    const merged = mergeEvidence([a, b])
    expect(merged).toHaveLength(1)
    expect(merged[0].confidence).toBe(.9)
  })

  test("blocks incomplete findings and allows complete report", () => {
    const evidence = [
      createEvidence({ kind: "request", sourceId: "r1", requestId: "r1", confidence: .9, details: "request evidence" }),
      createEvidence({ kind: "response", sourceId: "s1", requestId: "r1", responseId: "s1", confidence: .9, details: "response evidence" }),
      createEvidence({ kind: "attempt", sourceId: "a1", attemptId: "a1", confidence: .9, accountLabel: "attacker", details: "attempt evidence" }),
    ]
    const finding = buildFinding({
      target: "example.com",
      title: "Test finding",
      severity: "medium",
      hypothesisId: "hyp-1",
      attemptIds: ["a1"],
      evidence,
      summary: "A reproducible security behavior was observed.",
      impact: "A separate account can access protected data.",
      remediation: "Enforce authorization on the server.",
    })
    expect(checkFindingEvidence(finding).complete).toBe(true)
    expect(markReportable(finding).status).toBe("validated")
    expect(buildReportMarkdown(finding)).toContain("# Test finding")
  })

  test("finding fingerprint is stable for reordered evidence", () => {
    const a = createEvidence({ kind: "request", sourceId: "r1", requestId: "r1", confidence: .9, details: "request evidence" })
    const b = createEvidence({ kind: "response", sourceId: "s1", requestId: "r1", responseId: "s1", confidence: .9, details: "response evidence" })
    const base = { target: "example.com", title: "Stable", severity: "low" as const, hypothesisId: "h1", evidence: [a, b], summary: "summary", impact: "impact" }
    const first = buildFinding(base)
    const second = buildFinding({ ...base, evidence: [b, a] })
    expect(first.fingerprint).toBe(second.fingerprint)
    expect(first.id).toBe(second.id)
  })
})
