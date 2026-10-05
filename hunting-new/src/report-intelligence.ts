import type { FindingRecord } from "./findings"

export interface EvidenceCompleteness {
  complete: boolean
  missing: string[]
  score: number
}

export function checkFindingEvidence(finding: FindingRecord): EvidenceCompleteness {
  const checks: Array<[string, boolean]> = [
    ["hypothesis linkage", Boolean(finding.hypothesisId)],
    ["at least one evidence item", finding.evidenceIds.length > 0],
    ["request evidence", finding.requestIds.length > 0],
    ["response evidence", finding.responseIds.length > 0],
    ["validation attempt evidence", finding.attemptIds.length > 0],
    ["impact statement", Boolean(finding.impact.trim())],
    ["reproducible summary", Boolean(finding.summary.trim())],
  ]
  const passed = checks.filter(([, ok]) => ok).length
  return { complete: passed === checks.length, missing: checks.filter(([, ok]) => !ok).map(([name]) => name), score: passed / checks.length }
}

export function markReportable(finding: FindingRecord): FindingRecord {
  const gate = checkFindingEvidence(finding)
  if (!gate.complete) throw new Error("REPORT_BLOCKED: " + gate.missing.join(", "))
  return { ...finding, status: "validated", updatedAt: new Date().toISOString() }
}

export function buildReportMarkdown(finding: FindingRecord): string {
  const gate = checkFindingEvidence(finding)
  if (!gate.complete) throw new Error("REPORT_BLOCKED: " + gate.missing.join(", "))
  const lines = [
    "# " + finding.title,
    "",
    "**Severity:** " + finding.severity,
    "**Target:** " + finding.target,
    "**Finding ID:** " + finding.id,
    "",
    "## Summary",
    finding.summary,
    "",
    "## Impact",
    finding.impact,
    "",
    "## Evidence",
    ...finding.evidenceIds.map(id => "- " + id),
    "",
    "## Requests",
    ...finding.requestIds.map(id => "- " + id),
    "",
    "## Responses",
    ...finding.responseIds.map(id => "- " + id),
    "",
    "## Validation Attempts",
    ...finding.attemptIds.map(id => "- " + id),
    "",
    finding.remediation ? "## Remediation" : "",
    finding.remediation ?? "",
  ]
  return lines.filter((line, index, arr) => !(line === "" && arr[index - 1] === "")).join("\n") + "\n"
}
