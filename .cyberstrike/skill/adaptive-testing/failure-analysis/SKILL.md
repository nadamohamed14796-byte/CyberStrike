---
name: adaptive-failure-analysis
description: Diagnose failed security tests using observable evidence, confidence scoring, bounded follow-up decisions, and explicit handoff to the appropriate adaptive-testing skill.
category: adaptive-testing
version: "2.0.0"
author: CyberStrike
tags: [adaptive-testing, failure-analysis, diagnostics, response-analysis, evidence, confidence]
tech_stack: [http, web]
cwe_ids: []
chains_with: [transformation-analysis, technique-matcher, mutation-policy, response-differential]
prerequisites: []
severity_boost: {}

activation:
  mode: signal-driven
  signals:
    - baseline-failure
    - unexpected-rejection
    - payload-blocked
    - response-anomaly
    - validation-rejection
    - parser-error
    - http-401
    - http-403
    - http-406
    - http-429
  confidence_threshold: 0.70
  require_baseline: true

retry_policy:
  max_followups: 3
  max_transformations: 2
  stop_on_identical_failure: true
  stop_on_no_information_gain: true
---

# Adaptive Failure Analysis

## Purpose

Diagnose why a security test failed before selecting another technique.

This skill is a **diagnostic and decision-gating layer**. It must not assume that a WAF caused a failure, generate arbitrary payloads, or replace the specialized adaptive-testing skills.

The required flow is:

**Failure → classify → collect evidence → score confidence → decide whether more testing is justified → hand off to one appropriate next skill or stop.**

## Activation

Activate only when a baseline or bounded security test has a meaningful failure/anomaly signal.

A status code alone is not sufficient to conclude the cause of a failure.

Preferred activation signals include:
- A baseline security test was rejected unexpectedly.
- A payload was blocked while a comparable baseline request succeeded.
- The response changed materially after a controlled test.
- The application returned a validation/parser error.
- A repeated test produced a stable but unexplained rejection.
- HTTP 401/403/406/429 behavior occurs during an authorized security test and requires diagnosis.

Do **not** activate merely because a target returns 401/403/406/429 during ordinary browsing or because the target appears to use a security gateway.

## Inputs

Preserve and inspect, when available:
- Authorization/scope state.
- Original baseline request and response.
- Failed request and response.
- HTTP method, URL/path, parameter location, headers, cookies, and body shape.
- Status code, response headers, response body characteristics, and timing.
- Whether the request was authenticated and which account/context was used.
- Previous attempts and their outcomes.
- Existing technology/WAF/proxy fingerprints.
- Any normalization, encoding, parser, or redirect observations.

Never discard the baseline. It is the reference point for differential analysis.

## Failure Classification

Classify the failure into the most specific supported category:
- `SCOPE_OR_AUTH`
- `REQUEST_CONSTRUCTION`
- `APPLICATION_VALIDATION`
- `AUTHENTICATION`
- `AUTHORIZATION`
- `RATE_LIMIT`
- `INTERMEDIARY_FILTER`
- `WAF_LIKELY`
- `NORMALIZATION`
- `PARSER_BEHAVIOR`
- `BACKEND_REJECTION`
- `NETWORK_OR_TRANSPORT`
- `TOOL_FAILURE`
- `UNKNOWN`

Use `WAF_LIKELY` only when observable behavior supports an intermediary/security-filter hypothesis. Never infer it from a 403 alone.

If multiple explanations remain plausible, retain them as ranked hypotheses instead of forcing a single classification.

## Evidence Requirements

Every classification must be backed by observable evidence.

Useful evidence includes:
- Baseline succeeds while the tested variant fails.
- Failure is repeatable under the same controlled conditions.
- Response status, headers, body characteristics, or timing change consistently.
- Error messages identify application validation, authentication, authorization, parsing, or backend processing.
- Controlled transformations produce a meaningful response change.
- A known intermediary fingerprint is corroborated by behavior rather than assumed.

Evidence that is insufficient by itself:
- A single 403.
- A generic error page.
- A tool-reported timeout with no independent confirmation.
- A guessed WAF/CDN identity.
- A payload being rejected once.
- A scanner label without supporting request/response evidence.

## Confidence

Assign a confidence score from `0.00` to `1.00`.

Suggested interpretation:
- `0.00–0.39`: weak/unknown.
- `0.40–0.69`: plausible but insufficient for a strong classification.
- `0.70–0.89`: strong working hypothesis.
- `0.90–1.00`: highly supported by repeatable evidence.

Confidence describes the **failure classification**, not exploitability or severity.

Do not convert a high failure-classification confidence into a vulnerability claim.

## Structured Output

Return a machine-readable failure profile with these fields:

failure_profile:
  outcome: failed | blocked | rejected | anomalous | unknown
  classification: <category>
  confidence: 0.00
  baseline:
    available: true
    status: <status-or-null>
  failed_test:
    status: <status-or-null>
  observations:
    - <fact>
  evidence:
    - <observable fact>
  hypotheses:
    - name: <hypothesis>
      confidence: 0.00
      evidence_refs: [<evidence-id>]
  next_action:
    type: stop | transformation-analysis | technique-matcher | mutation-policy | response-differential
    reason: <why>
  retry:
    allowed: true | false
    remaining_budget: <integer>
    requires_information_gain: true
  unresolved:
    - <question>

Only record observations as facts. Keep hypotheses separate from observations.

## Decision Gate

After classification, choose exactly one next action:

### stop
- Evidence is insufficient.
- The failure is explained and no additional test is justified.
- Repeated attempts provide no new information.
- The retry budget is exhausted.
- The test would require uncontrolled or speculative retries.

### transformation-analysis
Use when evidence suggests encoding, normalization, canonicalization, or representation changes may explain the failure.

### technique-matcher
Use when the current technique appears inappropriate or the failure indicates that another bounded technique should be selected.

### mutation-policy
Use only when controlled mutation is justified and the mutation budget can remain bounded.

### response-differential
Use when comparing baseline and variant responses is the primary unresolved question.

Do not activate multiple downstream adaptive skills for the same failure unless the runtime explicitly creates a new signal after the first handoff.

## Retry and Information-Gain Rules

All follow-up attempts must be bounded.

Default limits:
- Maximum follow-ups: `3`.
- Maximum transformations: `2`.
- Stop when the same failure is reproduced without meaningful new evidence.
- Stop when a follow-up does not materially change the hypothesis ranking.
- Stop when the next action would be speculative rather than evidence-driven.

A follow-up is justified only when it has a defined information goal.

Examples of valid goals:
- Determine whether rejection is caused by normalization.
- Distinguish application validation from intermediary filtering.
- Compare a controlled variant against the preserved baseline.
- Determine whether the current technique is unsuitable.

Do not retry simply because the previous attempt failed.

## Handoff Contract

Pass the failure profile, baseline reference, failed-test reference, evidence, confidence, and remaining retry budget to the selected downstream skill.

The downstream skill must not silently reset the retry budget or discard prior evidence.

After the downstream test completes, emit a new signal for re-analysis only if the result materially changes the evidence.

## Safety and Quality Rules

- Respect authorization and target scope.
- Preserve the original baseline request/response.
- Never claim exploitability from failure behavior alone.
- Never label a response as WAF evidence without observable support.
- Do not generate unlimited retries.
- Do not escalate severity based only on blocking behavior.
- Do not fabricate missing request/response evidence.
- Prefer stopping over speculative testing.