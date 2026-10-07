---
name: saml-sec
description: Signal-driven saml security orchestration.
category: security-orchestration
verified: official
tags: [saml, signal-driven, evidence]
chains_with:
  - AUTH
  - NIST
  - hunt-saml
  - saml-sso-assertion-attacks
files: [SKILL.md]
---

# saml Security Router

Activate only on concrete saml protocol, parser, state, data-flow, or workflow evidence. Generic terms and scanner labels are insufficient.

## Routing
- AUTH
- NIST
- hunt-saml
- saml-sso-assertion-attacks

## Evidence lifecycle
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Preserve target, scope, identity/context, provenance, baseline, test result, impact, and negative results. Deduplicate by target + component + specialist + trigger + context.

## Safety
Use authorized labs, owned systems, or explicitly scoped assessments. Prefer synthetic data, reversible tests, and minimal-impact validation.
