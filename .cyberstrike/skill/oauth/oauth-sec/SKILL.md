---
name: oauth-sec
description: Signal-driven oauth security orchestration and evidence routing.
category: security-orchestration
verified: official
tags: [oauth, signal-driven, evidence, routing]
chains_with:
  - hunt-oauth
  - jwt-oauth-token-attacks
  - oauth-oidc-misconfiguration
  - offensive-oauth
files: [SKILL.md]
---

# oauth Security Router

Activate only from concrete oauth evidence. Generic topic words, scanner labels, version strings, or technology presence alone are not activation signals.

## Routing
- hunt-oauth
- jwt-oauth-token-attacks
- oauth-oidc-misconfiguration
- offensive-oauth

## Evidence gate
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, trigger, scope/identity, version/runtime, provenance, baseline, controlled test, result, impact, and negative results. Reuse evidence and deduplicate by target + component + specialist + trigger + context + impact-class.

## Safety
Use authorized labs, owned systems, or explicitly scoped engagements. Prefer reversible, minimal-impact validation.
