---
name: steganography-sec
description: Signal-driven steganography security orchestration.
category: security-orchestration
verified: official
tags: [steganography, signal-driven, evidence]
chains_with:
  - steganography-techniques
files: [SKILL.md]
---

# steganography Security Router

Activate only on concrete steganography artifact, pipeline, dependency, or data-flow evidence. Generic topic words and scanner labels are insufficient.

## Evidence lifecycle
signal -> context-confirmed -> artifact-observed -> controlled-reproduction -> impact-proven -> finding

Record target, component, version, provenance, scope, baseline, test result, impact, and negative results. Deduplicate by target + component + specialist + trigger + context.

## Safety
Use authorized repositories, test pipelines, labs, owned systems, or explicitly scoped assessments. Prefer isolated and reversible validation.
