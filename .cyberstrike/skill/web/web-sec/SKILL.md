---
name: web-sec
description: Signal-driven web security orchestration.
category: security-orchestration
verified: official
tags: [web, signal-driven, evidence]
chains_with:
  - OWASP_WSTG_4.2
files: [SKILL.md]
---

# web Security Router

Activate only on concrete web behavior, protocol, artifact, or security-control evidence. Generic topic words and scanner labels are insufficient.

## Routing
- OWASP_WSTG_4.2

## Evidence lifecycle
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, scope, identity/context, version/runtime, provenance, baseline, controlled test, result, impact, and negative results. Deduplicate by target + component + specialist + trigger + context.

## Safety
Use authorized labs, owned applications/systems, or explicitly scoped assessments. Prefer reversible, minimal-impact validation.
