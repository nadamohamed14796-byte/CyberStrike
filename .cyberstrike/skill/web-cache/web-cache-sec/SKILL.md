---
name: web-cache-sec
description: Signal-driven web-cache security orchestration.
category: security-orchestration
verified: official
tags: [web-cache, signal-driven, evidence]
chains_with:
  - attack-cache-poison
  - hunt-cache-poison
  - mitre_attack
  - web-cache-deception
files: [SKILL.md]
---

# web-cache Security Router

Activate only on concrete web-cache behavior, protocol, artifact, or security-control evidence. Generic topic words and scanner labels are insufficient.

## Routing
- attack-cache-poison
- hunt-cache-poison
- mitre_attack
- web-cache-deception

## Evidence lifecycle
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, scope, identity/context, version/runtime, provenance, baseline, controlled test, result, impact, and negative results. Deduplicate by target + component + specialist + trigger + context.

## Safety
Use authorized labs, owned applications/systems, or explicitly scoped assessments. Prefer reversible, minimal-impact validation.
