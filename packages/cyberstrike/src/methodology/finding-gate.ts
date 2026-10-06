import { Vulnerability } from "../session/vulnerability"
import { FalsePositive } from "./false-positive"

export type FindingGateRequirement = {
  id: number
  name: string
  passed: boolean
  evidence?: string
  reason?: string
}

export type FindingGateResult = {
  findingID: string
  passed: boolean
  requirements: FindingGateRequirement[]
}

function text(value?: string | null) { return (value ?? "").trim() }

export namespace FindingGate {
  /**
   * Ten deterministic requirements. Reporting can only consume findings that
   * pass this gate; each failed requirement carries a concrete reason/evidence gap.
   */
  export function validate(sessionID: string, findingID: string, scopeItems: string[] = []): FindingGateResult {
    const finding = Vulnerability.get(sessionID).find((item) => item.id === findingID)
    if (!finding) throw new Error(`Finding ${findingID} does not exist in session ${sessionID}`)

    const endpoint = text(finding.endpoint)
    const description = text(finding.description)
    const reproduction = text(finding.steps_to_reproduce)
    const impact = text(finding.business_impact)
    const remediation = text(finding.recommendation)
    const poc = text(finding.poc)
    const fp = FalsePositive.matches(sessionID, {
      vulnClass: finding.cwe_id ?? finding.title,
      endpoint: endpoint,
    })

    const inScope = scopeItems.length === 0 || scopeItems.some((scope) => {
      const s = scope.toLowerCase().trim()
      const a = endpoint.toLowerCase()
      return a === s || a.includes(s) || (s.startsWith("*.") && (a.includes(s.slice(1)) || a.includes(s.slice(2))))
    })

    const requirements: FindingGateRequirement[] = [
      { id: 1, name: "Finding exists and is not a candidate", passed: finding.status !== "duplicate" && finding.candidate == null, reason: finding.candidate ? "Finding is explicitly unconfirmed/candidate." : undefined },
      { id: 2, name: "Scope is proven", passed: inScope, reason: inScope ? undefined : "Affected endpoint/asset is not matched by the supplied scope." },
      { id: 3, name: "Endpoint is identified", passed: endpoint.length > 0, reason: "No affected endpoint/asset was recorded." },
      { id: 4, name: "Description contains concrete behavior", passed: description.length >= 40, reason: "Description is missing or too short to establish observed behavior." },
      { id: 5, name: "Reproduction is reproducible", passed: reproduction.length >= 30, reason: "Steps to reproduce are missing or too short." },
      { id: 6, name: "Evidence is preserved", passed: poc.length >= 20, reason: "Proof/evidence is missing. Include the relevant request/response or equivalent artifact." },
      { id: 7, name: "Impact is explicit", passed: impact.length >= 30, reason: "Business/security impact is missing or too vague." },
      { id: 8, name: "Remediation is explicit", passed: remediation.length >= 20, reason: "A concrete remediation is missing." },
      { id: 9, name: "Finding is triaged", passed: finding.status === "approved", reason: `Finding status is ${finding.status}; only approved findings are report-ready.` },
      { id: 10, name: "No known false-positive pattern blocks the finding", passed: fp.length === 0, reason: fp.length ? `Matched ${fp.length} prior false-positive pattern(s); review and resolve before reporting.` : undefined },
    ]
    return { findingID, passed: requirements.every((r) => r.passed), requirements }
  }

  export function validateAll(sessionID: string, scopeItems: string[] = []) {
    return Vulnerability.confirmed(sessionID).map((finding) => validate(sessionID, finding.id!, scopeItems))
  }
}
