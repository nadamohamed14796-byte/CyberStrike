---
name: waf-evasion
description: Specialized, bounded analysis of web filtering and intermediary transformations for authorized security testing.
category: evasion
version: "1.0.0"
author: CyberStrike
tags: [waf, evasion, filter-analysis, encoding, normalization, parser-differential]
tech_stack: [http, web]
cwe_ids: []
chains_with: [adaptive-failure-analysis, transformation-analysis, adaptive-technique-matcher]
prerequisites: [adaptive-failure-analysis]
severity_boost: {}
---

# WAF Evasion

## Purpose

Provide a reusable, evidence-driven layer for cases where an authorized web security test appears to be affected by filtering or intermediary processing.

This skill does not replace vulnerability-specific skills. It returns observations and ranked, policy-approved transformation techniques to the originating skill.

## Workflow

1. Establish a clean baseline.
2. Confirm that behavior is consistent with filtering/intermediary processing rather than application rejection.
3. Characterize observable transformations and normalization.
4. Match only existing, registered techniques whose tags and prerequisites fit the profile.
5. Apply the mutation policy and finite test budget.
6. Compare each variant with the baseline.
7. Return evidence to the originating vulnerability skill.

## Profiles

Track:

- suspected filtering behavior
- transformation type and confidence
- affected input location
- parser/normalization observations
- technique provenance
- test budget and stop conditions

## Safety and Quality Gates

- Authorized target and in-scope request only.
- No unlimited mutation or blind payload generation.
- No assumption that a block page proves a WAF.
- No promotion from response difference to vulnerability without validation.
- Preserve request/response provenance and reproducibility.
