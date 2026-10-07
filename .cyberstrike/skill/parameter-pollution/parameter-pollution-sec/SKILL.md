---
name: parameter-pollution-sec
description: Signal-driven parameter-pollution security orchestration.
category: security-orchestration
verified: official
tags: [parameter-pollution, signal-driven, evidence]
chains_with:
  - http-parameter-pollution
  - offensive-parameter-pollution
files: [SKILL.md]
---

# parameter-pollution Security Router

Activate only on concrete parameter-pollution behavior or data-flow evidence. Generic topic words and scanner labels are insufficient.

## Evidence gate
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, trigger, scope/identity, provenance, baseline, test, result, impact, and negative results. Reuse evidence and deduplicate by target + component + specialist + trigger + context.

## Routing
- http-parameter-pollution
- offensive-parameter-pollution

## Safety
Use authorized labs, owned systems, or explicitly scoped assessments; prefer reversible, minimal-impact validation.
