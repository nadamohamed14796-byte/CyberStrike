---
name: ai-security-sec
description: Signal-driven ai-security security orchestration and evidence routing.
category: security-orchestration
verified: official
tags: [ai-security, signal-driven, evidence, routing]
chains_with:
  - ai-ml-security
files: [SKILL.md]
---

# ai-security Security Router

Activate only from concrete ai-security evidence. Generic topic words, scanner labels, or technology presence alone are not activation signals.

## Routing
- ai-ml-security

## Evidence gate
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, exact trigger, scope/identity, version/runtime, provenance, baseline, controlled test, result, impact, and negative results. Reuse evidence and deduplicate by target + component + specialist + trigger + context + impact-class.

## Safety
Use authorized labs, CTFs, owned systems, or explicitly scoped engagements. Prefer reversible, minimal-impact validation and synthetic data.
