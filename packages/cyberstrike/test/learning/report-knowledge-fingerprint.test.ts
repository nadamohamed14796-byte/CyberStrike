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
