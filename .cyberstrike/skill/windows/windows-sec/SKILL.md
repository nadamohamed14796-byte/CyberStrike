---
name: windows-sec
description: Signal-driven windows security orchestration.
category: security-orchestration
verified: official
tags: [windows, signal-driven, evidence]
chains_with:
  - offensive-windows-boundaries
  - offensive-windows-mitigations
  - offensive-windows-privesc
  - windows-lateral-movement
  - windows-postexploit
  - windows-privilege-escalation
files: [SKILL.md]
---

# windows Security Router

Activate only on concrete windows behavior, protocol, artifact, or security-control evidence. Generic topic words and scanner labels are insufficient.

## Routing
- offensive-windows-boundaries
- offensive-windows-mitigations
- offensive-windows-privesc
- windows-lateral-movement
- windows-postexploit
- windows-privilege-escalation

## Evidence lifecycle
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, scope, identity/context, version/runtime, provenance, baseline, controlled test, result, impact, and negative results. Deduplicate by target + component + specialist + trigger + context.

## Safety
Use authorized labs, owned applications/systems, or explicitly scoped assessments. Prefer reversible, minimal-impact validation.
