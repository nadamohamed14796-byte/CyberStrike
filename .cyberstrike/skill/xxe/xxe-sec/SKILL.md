---
name: xxe-sec
description: Signal-driven xxe security orchestration.
category: web-application
verified: official
tags: [xxe, signal-driven, evidence]
chains_with:
  - attack-xxe
  - hunt-xxe
  - xxe-xml-external-entity
files: [SKILL.md]
---

# xxe Security Router

Activate only on concrete xxe data-flow, parser, browser, or application behavior. Generic topic words and scanner labels are insufficient.

## Routing
- attack-xxe
- hunt-xxe
- xxe-xml-external-entity

## Evidence lifecycle
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, context, input/source, sink/parser, provenance, baseline, controlled test, result, impact, and negative results. Deduplicate by target + endpoint/component + context + specialist.

## Safety
Use authorized applications and controlled test data. Prefer harmless markers, reversible tests, and minimal-impact validation.
