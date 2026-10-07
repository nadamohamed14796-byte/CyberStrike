---
name: mitre-attack-sec
description: Reference routing layer for mitre_attack content; generated/reference data remains unchanged.
category: reference
verified: official
tags: [reference, mitre_attack, routing]
chains_with:
  - TA0001_initial-access
  - TA0002_execution
  - TA0003_persistence
  - TA0004_privilege-escalation
  - TA0005_defense-evasion
  - TA0006_credential-access
  - TA0007_discovery
  - TA0008_lateral-movement
  - TA0009_collection
  - TA0010_exfiltration
  - TA0011_command-and-control
  - TA0040_impact
  - TA0042_resource-development
  - TA0043_reconnaissance
files: [SKILL.md]
---

# mitre_attack Reference Router

This layer selects relevant reference material without modifying or treating reference data as observed target evidence.

## Selection gate
Require a concrete assessment question, control mapping need, technique-family lookup, or evidence-classification need. Generic security keywords are insufficient.

## Provenance
Preserve source file, version, mapping context, assumptions, and retrieval time. Keep reference evidence separate from target observations.

## Stop condition
Return only the references needed for the current question; do not bulk-load the entire catalog.
