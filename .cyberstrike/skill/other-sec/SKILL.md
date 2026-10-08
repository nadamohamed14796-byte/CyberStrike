---
name: other-sec
description: Signal-driven miscellaneous security orchestration and evidence routing.
category: security-orchestration
verified: official
tags: [misc, security, signal-driven, evidence, routing]
files: [SKILL.md]
---

# Miscellaneous Security Router

Activate only when a concrete security signal does not have a more specific canonical router.

## Selection rules
1. Prefer an existing domain router before this fallback.
2. Identify the concrete protocol, framework, vulnerability class, artifact, or platform.
3. Select one narrow specialist from the existing folder registry.
4. Add a second specialist only when a distinct evidence-backed dependency exists.

## Evidence gate
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

A scanner label, generic technology name, isolated version string, or theoretical
issue is not a finding. Preserve target, scope, provenance, baseline, reproduction,
impact, and negative results.

## Bounds
Use the smallest relevant specialist, reuse evidence, deduplicate by target + signal +
component + impact-class, and stop when disproven or reproducible impact is established.

## Safety
Use authorized labs, owned systems, or explicitly scoped assessments. Prefer reversible,
minimal-impact validation and synthetic data.
