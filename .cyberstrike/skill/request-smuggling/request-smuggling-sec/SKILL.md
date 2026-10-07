---
name: request-smuggling-sec
description: Signal-driven request-smuggling security orchestration.
category: security-orchestration
verified: official
tags: [request-smuggling, signal-driven, evidence]
chains_with:
  - attack-request-smuggling
  - hunt-http-smuggling
  - offensive-request-smuggling
files: [SKILL.md]
---

# request-smuggling Security Router

Activate only on concrete request-smuggling behavior, state transition, protocol evidence, or workflow signal. Generic topic words and scanner labels are insufficient.

## Evidence lifecycle
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Preserve target, scope, identity/context, provenance, baseline, controlled test, result, impact, and negative results. Deduplicate by target + component + specialist + trigger + context + impact-class.

## Routing
- attack-request-smuggling
- hunt-http-smuggling
- offensive-request-smuggling

## Safety
Use authorized labs, owned systems, or explicitly scoped assessments. Prefer reversible and minimal-impact validation.
