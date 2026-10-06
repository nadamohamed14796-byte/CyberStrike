---
name: adaptive-technique-matcher
description: Rank existing vulnerability and evasion techniques against observed context and transformation evidence.
category: adaptive-testing
version: "1.0.0"
author: CyberStrike
tags: [adaptive-testing, technique-selection, tags, context, ranking]
tech_stack: [http, web]
cwe_ids: []
chains_with: [mutation-policy, waf-evasion]
prerequisites: [adaptive-failure-analysis]
severity_boost: {}
---

# Adaptive Technique Matcher

## Purpose

Select from existing registered skills instead of inventing uncontrolled techniques.

## Inputs

- Vulnerability class
- Target context
- Skill tags
- Failure profile
- Transformation profile
- Previous outcomes
- Scope and mutation policy

## Ranking

Prefer techniques with:

1. Exact vulnerability/context match
2. Matching transformation evidence
3. Existing skill provenance
4. Positive historical signal
5. Low noise and bounded cost

Reject techniques that are out of scope, unsupported by evidence, duplicated, or blocked by policy.

## Output

Return ranked technique references with score, reasons, prerequisites, and stop conditions.
