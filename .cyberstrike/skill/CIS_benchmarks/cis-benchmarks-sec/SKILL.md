---
name: cis-benchmarks-sec
description: Reference routing layer for CIS_benchmarks content; generated/reference data remains unchanged.
category: reference
verified: official
tags: [reference, CIS_benchmarks, routing]
chains_with:
  - Cloud_Providers
  - Operating_Systems
  - Server_Software
files: [SKILL.md]
---

# CIS_benchmarks Reference Router

This layer selects relevant reference material without modifying or treating reference data as observed target evidence.

## Selection gate
Require a concrete assessment question, control mapping need, technique-family lookup, or evidence-classification need. Generic security keywords are insufficient.

## Provenance
Preserve source file, version, mapping context, assumptions, and retrieval time. Keep reference evidence separate from target observations.

## Stop condition
Return only the references needed for the current question; do not bulk-load the entire catalog.
