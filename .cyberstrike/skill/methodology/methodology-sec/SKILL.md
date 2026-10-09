---
name: methodology-sec
description: Compatibility router for methodology and assessment-planning requests. The canonical scope, workflow, evidence, and safety gates are defined in ../SKILL.md. Route payload-specific needs to security-arsenal only when indicated.
category: methodology
tags: [methodology, bug-bounty, assessment, signal-driven, compatibility]
chains_with:
  - bb-methodology
  - bug-bounty
  - security-arsenal
files: [SKILL.md]
---

# Methodology Security Router

Use [../SKILL.md](../SKILL.md) as the single source of truth for methodology, assessment planning, workflow governance, scope confirmation, evidence requirements, stop conditions, and negative-result handling.

Routing:
- General hunting workflow, phase selection, hypothesis, target context, validation gates: `methodology`.
- Existing legacy references to `bb-methodology` or `bug-bounty`: follow their compatibility entry points, which delegate here.
- Concrete payloads, bypass tables, wordlists, and pattern references: `security-arsenal`, only when needed.
- Submission eligibility and final report structure: dedicated validation/triage and reporting skills.

Evidence sequence: signal -> scope-confirmed -> hypothesis -> minimal safe test -> reproducible outcome -> impact validated -> specialist handoff.

A methodology checklist is not vulnerability evidence. Apply only to authorized and explicitly scoped targets.
