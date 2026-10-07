---
name: rate-limit-sec
description: Signal-driven rate-limit security orchestration.
category: security-orchestration
verified: official
tags: [rate-limit, signal-driven, evidence]
chains_with:
  - attack-rate-limit-bypass
files: [SKILL.md]
---

# rate-limit Security Router

Activate only on concrete rate-limit behavior, state transition, protocol evidence, or workflow signal. Generic topic words and scanner labels are insufficient.

## Evidence lifecycle
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Preserve target, scope, identity/context, provenance, baseline, controlled test, result, impact, and negative results. Deduplicate by target + component + specialist + trigger + context + impact-class.

## Routing
- attack-rate-limit-bypass

## Safety
Use authorized labs, owned systems, or explicitly scoped assessments. Prefer reversible and minimal-impact validation.
