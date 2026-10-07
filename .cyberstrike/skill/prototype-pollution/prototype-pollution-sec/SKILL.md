---
name: prototype-pollution-sec
description: Signal-driven prototype-pollution security orchestration.
category: security-orchestration
verified: official
tags: [prototype-pollution, signal-driven, evidence]
chains_with:
  - attack-prototype-pollution
  - prototype-pollution-advanced
files: [SKILL.md]
---

# prototype-pollution Security Router

Activate only on concrete prototype-pollution behavior or data-flow evidence. Generic topic words and scanner labels are insufficient.

## Evidence gate
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, trigger, scope/identity, provenance, baseline, test, result, impact, and negative results. Reuse evidence and deduplicate by target + component + specialist + trigger + context.

## Routing
- attack-prototype-pollution
- prototype-pollution-advanced

## Safety
Use authorized labs, owned systems, or explicitly scoped assessments; prefer reversible, minimal-impact validation.
