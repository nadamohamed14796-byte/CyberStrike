---
name: linux-sec
description: >-
  Signal-driven linux security orchestration. Route concrete observations to
  the smallest existing specialist and preserve evidence across handoffs.
category: security-orchestration
verified: official
tags: [linux, signal-driven, evidence, routing]
chains_with:
  - linux-lateral-movement
  - linux-postexploit
  - linux-privilege-escalation
  - offensive-linux-privesc
files: [SKILL.md]
---

# linux Security Router

## Mission
Activate only from concrete linux evidence. Existing specialists remain
authoritative; this router coordinates them without broad keyword activation.

## Strong signals
- observed linux-specific protocol, artifact, endpoint, primitive, control, or workflow
- specialist-specific behavior matching one of: linux-lateral-movement, linux-postexploit, linux-privilege-escalation, offensive-linux-privesc
- reproducible differential behavior, security-control boundary, or data-flow evidence

## Weak/non-signals
Do not activate from the generic word "linux", a scanner label, version string,
technology presence alone, or an unverified theoretical claim.

## Routing
Use the smallest matching specialist:
- linux-lateral-movement
- linux-postexploit
- linux-privilege-escalation
- offensive-linux-privesc
Use a secondary specialist only when a distinct evidence-backed dependency is demonstrated.

## Evidence lifecycle
signal -> context-confirmed -> behavior-observed -> controlled-reproduction ->
impact-proven -> finding

Record target, exact trigger, identity/scope, relevant version/runtime, request or
artifact provenance, baseline, test, result, impact, and negative results.

## Bounded execution and deduplication
Reuse existing evidence and test the minimum variants. Canonical key:
target + component + specialist + trigger + identity/context + impact-class
Stop when disproven, non-exploitable, or reproducible impact is established.

## Safety
Use authorized CTFs, labs, owned systems, or explicitly scoped engagements.
Prefer synthetic data, reversible tests, minimal-impact validation, and isolated tooling.
