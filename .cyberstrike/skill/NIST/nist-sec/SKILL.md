---
name: nist-sec
description: Reference routing layer for NIST content; generated/reference data remains unchanged.
category: reference
verified: official
tags: [reference, NIST, routing]
chains_with:
  - CSF_v2.0
  - SP800-171_rev3
  - SP800-218_SSDF
  - SP800-53_rev5
files: [SKILL.md]
---

# NIST Reference Router

This layer selects relevant reference material without modifying or treating reference data as observed target evidence.

## Selection gate
Require a concrete assessment question, control mapping need, technique-family lookup, or evidence-classification need. Generic security keywords are insufficient.

## Provenance
Preserve source file, version, mapping context, assumptions, and retrieval time. Keep reference evidence separate from target observations.

## Stop condition
Return only the references needed for the current question; do not bulk-load the entire catalog.
