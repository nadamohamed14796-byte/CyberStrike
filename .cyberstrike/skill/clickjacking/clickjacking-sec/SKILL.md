---
name: clickjacking-sec
description: Signal-driven clickjacking security orchestration and evidence routing.
category: security-orchestration
verified: official
tags: [clickjacking, signal-driven, evidence, routing]
chains_with:
  - clickjacking
  - hunt-clickjacking
files: [SKILL.md]
---

# clickjacking Security Router

Activate only from concrete clickjacking evidence. Generic topic words, scanner labels, or technology presence alone are not activation signals.

## Routing
- clickjacking
- hunt-clickjacking

## Evidence gate
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, exact trigger, scope/identity, version/runtime, provenance, baseline, controlled test, result, impact, and negative results. Reuse evidence and deduplicate by target + component + specialist + trigger + context + impact-class.

## Safety
Use authorized labs, CTFs, owned systems, or explicitly scoped engagements. Prefer reversible, minimal-impact validation and synthetic data.
