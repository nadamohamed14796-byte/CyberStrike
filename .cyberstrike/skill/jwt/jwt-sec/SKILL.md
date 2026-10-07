---
name: jwt-sec
description: >-
  Signal-driven jwt security orchestration. Route concrete observations to
  the smallest existing specialist and preserve evidence across handoffs.
category: security-orchestration
verified: official
tags: [jwt, signal-driven, evidence, routing]
chains_with:
  - RECON
  - api-auth-and-jwt-abuse
  - attack-jwt
  - hunt-jwt-crypto
  - jwt-oauth-token-attacks
  - offensive-jwt
files: [SKILL.md]
---

# jwt Security Router

## Mission
Activate only from concrete jwt evidence. Existing specialists remain
authoritative; this router coordinates them without broad keyword activation.

## Strong signals
- observed target behavior, protocol, artifact, endpoint, primitive, control, or
  workflow specifically associated with jwt
- a specialist-specific signal matching one of: RECON, api-auth-and-jwt-abuse, attack-jwt, hunt-jwt-crypto, jwt-oauth-token-attacks, offensive-jwt
- reproducible differential behavior, security-control boundary, or data-flow evidence

## Weak/non-signals
Do not activate from the generic word "jwt", a scanner label, version string,
technology presence alone, or an unverified theoretical claim.

## Routing
Use the smallest matching specialist:
- RECON
- api-auth-and-jwt-abuse
- attack-jwt
- hunt-jwt-crypto
- jwt-oauth-token-attacks
- offensive-jwt
Use a secondary specialist only when a distinct evidence-backed data-flow or
dependency is demonstrated.

## Evidence lifecycle
signal -> context-confirmed -> behavior-observed -> controlled-reproduction ->
impact-proven -> finding

Record target, exact trigger, identity/scope, relevant version/runtime, request or
artifact provenance, observed baseline, mutation/test, result, impact, and negative
results. Preserve evidence across handoffs.

## Bounded execution and deduplication
Reuse existing evidence. Test the minimum variants needed to distinguish hypotheses.
Canonical key:
target + component + specialist + trigger + identity/context + impact-class

Stop when the hypothesis is disproven, non-exploitable, or reproducible impact is
established.

## Safety
Use authorized CTFs, labs, owned systems, or explicitly scoped engagements. Prefer
synthetic data, reversible tests, minimal-impact validation, and isolated tooling.
