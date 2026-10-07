---
name: nosql-sec
description: Signal-driven nosql security orchestration and evidence routing.
category: security-orchestration
verified: official
tags: [nosql, signal-driven, evidence, routing]
chains_with:
  - hunt-nosqli
files: [SKILL.md]
---

# nosql Security Router

Activate only from concrete nosql evidence. Generic topic words, scanner labels, version strings, or technology presence alone are not activation signals.

## Routing
- hunt-nosqli

## Evidence gate
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, trigger, scope/identity, version/runtime, provenance, baseline, controlled test, result, impact, and negative results. Reuse evidence and deduplicate by target + component + specialist + trigger + context + impact-class.

## Safety
Use authorized labs, owned systems, or explicitly scoped engagements. Prefer reversible, minimal-impact validation.
