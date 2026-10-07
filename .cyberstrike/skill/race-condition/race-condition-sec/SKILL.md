---
name: race-condition-sec
description: Signal-driven race-condition security orchestration.
category: security-orchestration
verified: official
tags: [race-condition, signal-driven, evidence]
chains_with:
  - attack-race-condition
  - hunt-race-condition
  - offensive-race-condition
  - offensive-toctou
files: [SKILL.md]
---

# race-condition Security Router

Activate only on concrete race-condition behavior, state transition, protocol evidence, or workflow signal. Generic topic words and scanner labels are insufficient.

## Evidence lifecycle
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Preserve target, scope, identity/context, provenance, baseline, controlled test, result, impact, and negative results. Deduplicate by target + component + specialist + trigger + context + impact-class.

## Routing
- attack-race-condition
- hunt-race-condition
- offensive-race-condition
- offensive-toctou

## Safety
Use authorized labs, owned systems, or explicitly scoped assessments. Prefer reversible and minimal-impact validation.
