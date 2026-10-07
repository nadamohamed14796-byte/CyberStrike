---
name: web3-sec
description: Signal-driven web3 security orchestration.
category: security-orchestration
verified: official
tags: [web3, signal-driven, evidence]
chains_with:
  - web3-audit
files: [SKILL.md]
---

# web3 Security Router

Activate only on concrete web3 behavior, protocol, artifact, or security-control evidence. Generic topic words and scanner labels are insufficient.

## Routing
- web3-audit

## Evidence lifecycle
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, scope, identity/context, version/runtime, provenance, baseline, controlled test, result, impact, and negative results. Deduplicate by target + component + specialist + trigger + context.

## Safety
Use authorized labs, owned applications/systems, or explicitly scoped assessments. Prefer reversible, minimal-impact validation.
