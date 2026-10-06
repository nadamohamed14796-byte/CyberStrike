---
name: adaptive-failure-analysis
description: Analyze why a security test failed before selecting the next bounded technique.
category: adaptive-testing
version: "1.0.0"
author: CyberStrike
tags: [adaptive-testing, failure-analysis, diagnostics, response-analysis]
tech_stack: [http, web]
cwe_ids: []
chains_with: [transformation-analysis, technique-matcher]
prerequisites: []
severity_boost: {}
---

# Adaptive Failure Analysis

## Purpose

Classify a failed baseline test without assuming that a WAF caused the failure.

## Analyze

- Scope and authorization state
- Request construction and parameter location
- Application validation/rejection
- Intermediary filtering or blocking
- Encoding/decoding or normalization behavior
- Parser differences
- Backend rejection or error handling
- Unknown/insufficient evidence

## Output

Produce a structured failure profile with observations, evidence, confidence, and unresolved hypotheses.

## Rules

- Do not classify a failure as WAF evidence without observable behavior.
- Do not generate unlimited retries.
- Preserve the original baseline request/response for comparison.
