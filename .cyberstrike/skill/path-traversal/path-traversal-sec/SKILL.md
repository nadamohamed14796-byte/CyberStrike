---
name: path-traversal-sec
description: Signal-driven path-traversal security orchestration.
category: security-orchestration
verified: official
tags: [path-traversal, signal-driven, evidence]
chains_with:
  - hunt-lfi
  - path-traversal-lfi
files: [SKILL.md]
---

# path-traversal Security Router

Activate only on concrete path-traversal behavior or data-flow evidence. Generic topic words and scanner labels are insufficient.

## Evidence gate
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, trigger, scope/identity, provenance, baseline, test, result, impact, and negative results. Reuse evidence and deduplicate by target + component + specialist + trigger + context.

## Routing
- hunt-lfi
- path-traversal-lfi

## Safety
Use authorized labs, owned systems, or explicitly scoped assessments; prefer reversible, minimal-impact validation.
