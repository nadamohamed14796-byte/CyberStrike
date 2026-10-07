---
name: redteam-sec
description: Signal-driven red-team assessment orchestration for authorized, scoped engagements.
category: red-team
verified: official
tags: [redteam, assessment, signal-driven, evidence, scope]
chains_with:
  - hunt-broken-function-level-auth
  - hunt-information-disclosure
  - hunt-mass-assignment
  - hunt-metrics-exposure
  - hunt-schema-enumeration
  - wstg-web-pentest
  - password-spray-methodology
  - recon-sector
  - recon-sector-expansion
  - wp-plugin-automation
  - wp-plugin-cve-hunt
files: [SKILL.md]
---

# Red-Team Security Router

## Mission
Coordinate authorized red-team workflows without activating broad attack playbooks
from generic red-team terminology. Every action must have a scope, objective,
evidence requirement, and stop condition.

## Activation
Require an explicit authorized engagement context plus a concrete objective such
as identity/access assessment, application workflow assessment, exposure validation,
technology-specific review, or controlled adversary simulation.

## Routing
Choose the narrowest specialist matching the observed application, identity,
platform, or workflow signal. Preserve the existing specialist as the authority;
this router only coordinates sequencing and evidence.

## Evidence lifecycle
scope-confirmed -> objective-confirmed -> signal-observed -> controlled-validation ->
impact-proven -> finding/assessment-result

Record scope, authorization, target, identity, action, provenance, baseline, result,
impact, and negative results. Do not treat a technique catalog or scanner label as
proof.

## Bounds
One primary objective at a time. Limit secondary handoffs to evidence-backed
dependencies. Deduplicate repeated actions and stop when the objective is met,
disproven, or requires explicit scope expansion.

## Safety
Authorized engagements, labs, CTFs, owned environments, and approved simulations
only. Respect rate limits, data handling rules, and engagement stop conditions.
