---
name: ssti-sec
description: Signal-driven server-side template security orchestration.
category: injection
verified: official
tags: [ssti, templates, rendering, signal-driven, evidence]
chains_with:
  - attack-ssti
  - hunt-ssti
  - offensive-ssti
  - ssti-server-side-template-injection
files: [SKILL.md]
---

# Template Rendering Security Router

Activate only when user-controlled data reaches a server-side template or rendering
boundary and a reproducible evaluation or context-specific rendering signal exists.

## Evidence lifecycle
signal -> template-context-confirmed -> controlled-evaluation -> impact-proven -> finding

Record template engine, rendering context, input location, provenance, baseline,
controlled result, impact, and negative results. Generic template syntax or scanner
labels are insufficient.

## Safety
Use authorized applications and inert validation first. Prefer harmless expressions
and reversible tests.
