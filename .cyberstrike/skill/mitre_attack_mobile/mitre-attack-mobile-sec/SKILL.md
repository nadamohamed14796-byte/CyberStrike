---
name: mitre-attack-mobile-sec
description: Reference routing layer for mitre_attack_mobile content; generated/reference data remains unchanged.
category: reference
verified: official
tags: [reference, mitre_attack_mobile, routing]
chains_with:
  - TA0027_initial-access
  - TA0028_persistence
  - TA0029_privilege-escalation
  - TA0030_defense-evasion
  - TA0031_credential-access
  - TA0032_discovery
  - TA0033_lateral-movement
  - TA0034_impact
  - TA0035_collection
  - TA0036_exfiltration
  - TA0037_command-and-control
  - TA0041_execution
files: [SKILL.md]
---

# mitre_attack_mobile Reference Router

This layer selects relevant reference material without modifying or treating reference data as observed target evidence.

## Selection gate
Require a concrete assessment question, control mapping need, technique-family lookup, or evidence-classification need. Generic security keywords are insufficient.

## Provenance
Preserve source file, version, mapping context, assumptions, and retrieval time. Keep reference evidence separate from target observations.

## Stop condition
Return only the references needed for the current question; do not bulk-load the entire catalog.
