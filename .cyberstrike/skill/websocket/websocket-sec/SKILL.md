---
name: websocket-sec
description: Signal-driven websocket security orchestration.
category: security-orchestration
verified: official
tags: [websocket, signal-driven, evidence]
chains_with:
  - attack-websocket
  - hunt-websocket
  - websocket-security
files: [SKILL.md]
---

# websocket Security Router

Activate only on concrete websocket behavior, protocol, artifact, or security-control evidence. Generic topic words and scanner labels are insufficient.

## Routing
- attack-websocket
- hunt-websocket
- websocket-security

## Evidence lifecycle
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, scope, identity/context, version/runtime, provenance, baseline, controlled test, result, impact, and negative results. Deduplicate by target + component + specialist + trigger + context.

## Safety
Use authorized labs, owned applications/systems, or explicitly scoped assessments. Prefer reversible, minimal-impact validation.
