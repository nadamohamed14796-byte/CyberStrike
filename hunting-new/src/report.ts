import path from "node:path"
import { ensureDir,targetDir } from "./store"
import type { FindingRecord } from "./findings"
import { checkFindingEvidence } from "./report-intelligence"

export async function writeReport(
  root:string,
  finding:FindingRecord,
  sections:Record<string,string>={},
){
  if(finding.status!=="validated" && finding.status!=="reported") throw new Error("REPORT_GATE_FAILED")
  const gate=checkFindingEvidence(finding)
  if(!gate.complete) throw new Error("REPORT_GATE_FAILED: "+gate.missing.join(", "))

  const dir=path.join(targetDir(root,finding.target),"reports","drafts")
  await ensureDir(dir)
  const file=path.join(dir,finding.id+".md")
  const lines=[
    "# "+(sections.title??finding.title),
    "",
    "## Summary",
    sections.summary??finding.summary,
    "",
    "## Affected Asset",
    sections.asset??finding.target,
    "",
    "## Affected Endpoint",
    sections.endpoint??(finding.requestIds[0]??"Unknown"),
    "",
    "## Severity",
    finding.severity,
    "",
    "## Impact",
    sections.impact??finding.impact,
    "",
    "## Account Context",
    finding.accountLabels.length ? finding.accountLabels.join(", ") : "Not recorded",
    "",
    "## Steps to Reproduce",
    sections.steps??"See linked validation attempts and request/response evidence.",
    "",
    "## Evidence",
    ...finding.evidenceIds.map(id=>"- "+id),
    "",
    "## Requests",
    ...finding.requestIds.map(id=>"- "+id),
    "",
    "## Responses",
    ...finding.responseIds.map(id=>"- "+id),
    "",
    "## Validation Attempts",
    ...finding.attemptIds.map(id=>"- "+id),
    "",
    "## JavaScript Assets",
    ...finding.jsAssetIds.map(id=>"- "+id),
    "",
    "## Functions",
    ...finding.functionIds.map(id=>"- "+id),
    "",
    "## Root Cause",
    sections.root_cause??"Supported by the persisted evidence and validation chain.",
    "",
    "## Remediation",
    sections.remediation??finding.remediation??"",
  ]
  await Bun.write(file,lines.join("\n").replace(/\n{3,}/g,"\n\n")+"\n")
  return file
}
