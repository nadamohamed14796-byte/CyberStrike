---
name: adaptive-testing-sec
description: Signal-driven adaptive-testing security orchestration and evidence routing.
category: security-orchestration
verified: official
tags: [adaptive-testing, signal-driven, evidence, routing]
chains_with:
  - failure-analysis
  - mutation-policy
  - response-differential
  - technique-matcher
  - transformation-analysis
files: [SKILL.md]
---

# adaptive-testing Security Router

Activate only from concrete adaptive-testing evidence. Generic topic words, scanner labels, or technology presence alone are not activation signals.

## Routing
- failure-analysis
- mutation-policy
- response-differential
- technique-matcher
- transformation-analysis

## Evidence gate
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, exact trigger, scope/identity, version/runtime, provenance, baseline, controlled test, result, impact, and negative results. Reuse evidence and deduplicate by target + component + specialist + trigger + context + impact-class.

## Safety
Use authorized labs, CTFs, owned systems, or explicitly scoped engagements. Prefer reversible, minimal-impact validation and synthetic data.
