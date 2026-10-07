---
name: mobile-sec
description: Signal-driven mobile security orchestration and evidence routing.
category: security-orchestration
verified: official
tags: [mobile, signal-driven, evidence, routing]
chains_with:
  - android-pentesting-tricks
  - apk-redteam-pipeline
  - ios-pentesting-tricks
  - ios-redteam-pipeline
  - mobile-ssl-pinning-bypass
  - offensive-mobile
files: [SKILL.md]
---

# mobile Security Router

Activate only from concrete mobile evidence. Generic topic words, scanner labels, version strings, or technology presence alone are not activation signals.

## Routing
- android-pentesting-tricks
- apk-redteam-pipeline
- ios-pentesting-tricks
- ios-redteam-pipeline
- mobile-ssl-pinning-bypass
- offensive-mobile

## Evidence gate
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, trigger, scope/identity, version/runtime, provenance, baseline, controlled test, result, impact, and negative results. Reuse evidence and deduplicate by target + component + specialist + trigger + context + impact-class.

## Safety
Use authorized labs, owned systems, or explicitly scoped engagements. Prefer reversible, minimal-impact validation.
