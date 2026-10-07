---
name: mitre-attack-ics-sec
description: Reference routing layer for mitre_attack_ics content; generated/reference data remains unchanged.
category: reference
verified: official
tags: [reference, mitre_attack_ics, routing]
chains_with:
  - TA0100_collection
  - TA0101_command-and-control
  - TA0102_discovery
  - TA0103_evasion
  - TA0104_execution
  - TA0105_impact
  - TA0106_impair-process-control
  - TA0107_inhibit-response-function
  - TA0108_initial-access
  - TA0109_lateral-movement
  - TA0110_persistence
  - TA0111_privilege-escalation
files: [SKILL.md]
---

# mitre_attack_ics Reference Router

This layer selects relevant reference material without modifying or treating reference data as observed target evidence.

## Selection gate
Require a concrete assessment question, control mapping need, technique-family lookup, or evidence-classification need. Generic security keywords are insufficient.

## Provenance
Preserve source file, version, mapping context, assumptions, and retrieval time. Keep reference evidence separate from target observations.

## Stop condition
Return only the references needed for the current question; do not bulk-load the entire catalog.
