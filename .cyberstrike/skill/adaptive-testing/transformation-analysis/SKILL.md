---
name: transformation-analysis
description: Identify observable input transformations such as decoding, normalization, canonicalization, and representation changes.
category: adaptive-testing
version: "1.0.0"
author: CyberStrike
tags: [adaptive-testing, transformation, encoding, decoding, normalization, parser]
tech_stack: [http, web]
cwe_ids: []
chains_with: [technique-matcher, waf-evasion]
prerequisites: [adaptive-failure-analysis]
severity_boost: {}
---

# Transformation Analysis

## Purpose

Build an evidence-based profile of how an application or intermediary transforms input.

## Observe

- Input versus reflected/processed representation
- Response differences caused by representation changes
- URL, JSON, form, and header representation handling
- Normalization and canonicalization behavior
- Parser boundaries and inconsistent interpretation

## Output

Record:

- transformation
- observed/suspected/unknown status
- evidence
- confidence
- affected input location

## Rules

- Distinguish observation from hypothesis.
- Never assume a decoder or normalization step exists.
- Reuse the smallest test set that can distinguish competing hypotheses.
