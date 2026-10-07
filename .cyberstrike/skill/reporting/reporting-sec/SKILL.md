---
name: reporting-sec
description: Signal-driven reporting security orchestration.
category: security-orchestration
verified: official
tags: [reporting, signal-driven, evidence]
chains_with:
  - bugcrowd-reporting
  - evidence-hygiene
  - offensive-reporting
  - redteam-report-template
  - report-writing
  - triage-validation
files: [SKILL.md]
---

# reporting Security Router

Activate only on concrete reporting behavior, state transition, protocol evidence, or workflow signal. Generic topic words and scanner labels are insufficient.

## Evidence lifecycle
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Preserve target, scope, identity/context, provenance, baseline, controlled test, result, impact, and negative results. Deduplicate by target + component + specialist + trigger + context + impact-class.

## Routing
- bugcrowd-reporting
- evidence-hygiene
- offensive-reporting
- redteam-report-template
- report-writing
- triage-validation

## Safety
Use authorized labs, owned systems, or explicitly scoped assessments. Prefer reversible and minimal-impact validation.
