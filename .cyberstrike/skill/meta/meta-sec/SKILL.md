---
name: meta-sec
description: Signal-driven methodology and research-reference orchestration for CyberStrike.
category: methodology
verified: official
tags: [methodology, references, research, signal-driven]
chains_with:
  - attack-patterns-reference
  - cross-wave-delta-analysis
  - google-dorks-catalog
  - pentest-playbook
  - recon-playbook
  - sector-recon-methodology
files: [SKILL.md]
---

# Meta Security Router

Use this router for methodology, reference, prioritization, and research-planning signals. It does not activate operational attack skills merely because a technique is mentioned.

## Routing
- attack-patterns-reference
- cross-wave-delta-analysis
- google-dorks-catalog
- pentest-playbook
- recon-playbook
- sector-recon-methodology

## Evidence gate
signal -> context-confirmed -> reference-selected -> plan-produced -> validated-use

Preserve source provenance, scope, assumptions, and confidence. Keep reference material separate from observed target evidence.

## Safety
Use references for authorized research, labs, CTFs, and scoped engagements. Do not treat catalog entries as proof of a vulnerability.
