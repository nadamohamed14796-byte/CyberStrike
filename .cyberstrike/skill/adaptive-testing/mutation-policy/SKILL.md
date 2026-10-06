---
name: adaptive-mutation-policy
description: Apply bounded, evidence-driven mutation rules and stop conditions to adaptive testing.
category: adaptive-testing
version: "1.0.0"
author: CyberStrike
tags: [adaptive-testing, mutation, policy, limits, deduplication]
tech_stack: [http, web]
cwe_ids: []
chains_with: [technique-matcher, response-differential]
prerequisites: [adaptive-failure-analysis]
severity_boost: {}
---

# Adaptive Mutation Policy

## Purpose

Control adaptive variants so testing remains finite, relevant, scoped, and reproducible.

## Policy

- Require a reason for every mutation.
- Prefer one transformation at a time when isolating behavior.
- Deduplicate equivalent requests.
- Enforce configurable attempt and mutation-depth budgets.
- Stop after repeated equivalent outcomes.
- Stop on scope violations, unsafe conditions, or loss of evidence quality.
- Keep original request/response provenance.

## Output

Record the selected mutation, reason, parent technique, budget consumed, and result.
