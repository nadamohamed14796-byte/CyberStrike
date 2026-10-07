---
name: open-redirect-sec
description: Signal-driven open-redirect security orchestration.
category: security-orchestration
verified: official
tags: [open-redirect, signal-driven, evidence]
chains_with:
  - attack-open-redirect
  - hunt-open-redirect
  - offensive-open-redirect
files: [SKILL.md]
---

# open-redirect Security Router

Activate only on concrete open-redirect behavior or data-flow evidence. Generic topic words and scanner labels are insufficient.

## Evidence gate
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, trigger, scope/identity, provenance, baseline, test, result, impact, and negative results. Reuse evidence and deduplicate by target + component + specialist + trigger + context.

## Routing
- attack-open-redirect
- hunt-open-redirect
- offensive-open-redirect

## Safety
Use authorized labs, owned systems, or explicitly scoped assessments; prefer reversible, minimal-impact validation.
