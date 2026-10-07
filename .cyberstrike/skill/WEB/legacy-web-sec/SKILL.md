---
name: legacy-web-sec
description: Reference routing layer for WEB content; generated/reference data remains unchanged.
category: reference
verified: official
tags: [reference, WEB, routing]
chains_with:
  - waf-xss-bypass
files: [SKILL.md]
---

# WEB Reference Router

This layer selects relevant reference material without modifying or treating reference data as observed target evidence.

## Selection gate
Require a concrete assessment question, control mapping need, technique-family lookup, or evidence-classification need. Generic security keywords are insufficient.

## Provenance
Preserve source file, version, mapping context, assumptions, and retrieval time. Keep reference evidence separate from target observations.

## Stop condition
Return only the references needed for the current question; do not bulk-load the entire catalog.
