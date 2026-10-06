---
name: transformation-analysis
description: Identify and validate observable input transformations using signal-driven analysis, controlled comparisons, provenance, confidence, and bounded testing.
category: adaptive-testing
version: "2.0.0"
author: CyberStrike
tags: [adaptive-testing, transformation, encoding, decoding, normalization, parser, evidence]
tech_stack: [http, web]
cwe_ids: []
chains_with: [adaptive-failure-analysis, mutation-policy, response-differential, technique-matcher, waf-evasion]
prerequisites: [adaptive-failure-analysis]
severity_boost: {}

activation:
  mode: signal-driven
  signals:
    - transformation-analysis-requested
    - transformation-candidate
    - encoding-anomaly
    - normalization-anomaly
    - parser-anomaly
    - response-differential
    - failure-analysis-handoff
  confidence_threshold: 0.70
  require_parent_evidence: true

testing:
  max_transformations_per_handoff: 2
  max_rechecks: 2
  require_single_variable_change: true
  require_information_gain: true
  stop_on_no_new_evidence: true

promotion:
  states:
    - unknown
    - suspected
    - observed
    - reproducible
    - security-relevant
  exploitability_requires_separate_validation: true
---

# Transformation Analysis

## Purpose

Build an evidence-based profile of how an application or intermediary interprets, decodes, normalizes, canonicalizes, parses, or otherwise transforms input.

This skill is an **analysis and validation layer**, not an unlimited transformation generator.

Required flow:

`signal → preserve baseline → define competing hypotheses → inspect representation → bounded comparison → reproduce when justified → classify → handoff or stop`

## Activation

Activate only when a concrete transformation-related signal exists.

Valid signals include:

- `transformation-analysis-requested`
- `transformation-candidate`
- `encoding-anomaly`
- `normalization-anomaly`
- `parser-anomaly`
- `response-differential`
- `failure-analysis-handoff`

Do **not** activate merely because:

- a target accepts encoded input;
- a WAF/CDN is present;
- a payload failed;
- a technology supports a known encoding;
- a generic "bypass" keyword appears.

The runtime must provide parent evidence and the input location being analyzed.

## Required Inputs

Require:

- authorization and scope state;
- baseline request/response reference;
- parent test reference;
- triggering signal;
- affected input location;
- original representation;
- previous transformation attempts;
- current adaptive budget.

When available, also use:

- failure profile;
- response differential;
- content type;
- parser/framework hints;
- account/session context;
- intermediary fingerprints.

If baseline or parent evidence is missing, return `stop`.

## Transformation Categories

Classify only what the evidence supports.

Possible categories include:

- URL encoding/decoding;
- percent normalization;
- Unicode normalization;
- HTML entity handling;
- JSON escaping/unescaping;
- form encoding;
- path canonicalization;
- header normalization;
- case normalization;
- whitespace normalization;
- delimiter handling;
- parser-specific coercion;
- duplicate parameter handling;
- content-type interpretation;
- multi-stage decoding;
- intermediary-to-backend representation mismatch.

Do not assume a category is active solely because it is common for the target technology.

## Hypothesis Model

Separate observations from hypotheses.

Example:

```
transformation_hypothesis:
  name: <specific-transformation>
  input_location: <parameter/path/header/body>
  expected_behavior: <what should happen if hypothesis is true>
  competing_explanations:
    - <alternative>
  evidence_refs:
    - <ref>
  confidence: 0.00
```

A hypothesis must identify:

1. what representation may change;
2. where the change occurs;
3. what observable result would distinguish it;
4. at least one plausible alternative explanation when ambiguity exists.

## Controlled Testing

Use the smallest test set capable of distinguishing hypotheses.

Default rule:

- change one representation variable at a time;
- preserve the original request as baseline;
- keep authentication/session context stable;
- keep target/endpoint constant;
- record the exact transformation applied;
- compare paired responses through `adaptive-response-differential`.

Do not combine multiple encodings, delimiters, parser changes, and parameter changes in one mutation unless there is explicit evidence that a composed transformation is the hypothesis.

## Transformation Profile

Produce:

```
transformation_profile:
  outcome: unknown | changed | inconclusive
  state: unknown | suspected | observed | reproducible | security-relevant
  confidence: 0.00
  input_location: <location>
  original_representation:
    value_ref: <ref>
    description: <description>
  transformed_representation:
    value_ref: <ref-or-null>
    description: <description>
  transformation:
    type: <type>
    stage: client | intermediary | application | backend | unknown
  observations:
    - <fact>
  evidence_refs:
    - <ref>
  competing_hypotheses:
    - <hypothesis>
  reproducibility:
    required: true | false
    rechecks: <integer>
    result: reproduced | not-reproduced | not-tested
  next_action:
    type: mutation-policy | response-differential | technique-matcher | stop
    reason: <why>
```

Confidence describes evidence for the transformation behavior, not exploitability or severity.

Suggested confidence interpretation:

- 0.00–0.39: weak/unknown
- 0.40–0.69: plausible/suspected
- 0.70–0.89: strong observed signal
- 0.90–1.00: highly supported/reproducible

## Classification

### Unknown

No sufficient evidence of a transformation exists.

Action: stop unless a specific bounded test can distinguish a valid hypothesis.

### Suspected

There is an evidence-backed hypothesis, but alternative explanations remain.

Action: allow a bounded controlled test.

### Observed

A transformation is directly observable from paired evidence.

Action: pass the transformation profile to response differential and/or technique matcher.

### Reproducible

The same transformation behavior is observed under controlled repeated testing.

Action: emit a validation or routing signal as appropriate.

### Security-relevant

The transformation is reproducible and materially affects a security hypothesis.

Action: hand off for separate security validation. Do not declare exploitability here.

## Reproducibility

When a transformation appears meaningful:

1. Preserve the original pair.
2. Repeat only when needed to distinguish competing explanations.
3. Keep the same account/session context.
4. Change only the relevant representation variable.
5. Compare repeated results against the original baseline.

Default maximum: **2 rechecks**.

Stop if:

- the transformation cannot be reproduced;
- no new evidence is produced;
- the hypothesis remains indistinguishable from alternatives;
- the adaptive budget is exhausted.

## Handoff Contract

When handing off, pass:

- `transformation_profile`;
- baseline request/response references;
- parent test reference;
- affected input location;
- exact transformation lineage;
- evidence references;
- competing hypotheses;
- confidence;
- remaining budget.

Downstream skills must preserve provenance and must not silently reset budgets.

Suggested routing:

- `mutation-policy` when a bounded variant is required.
- `response-differential` when paired behavior needs formal comparison.
- `technique-matcher` when the transformation changes which technique is appropriate.
- `stop` when evidence is insufficient or no information gain remains.

Do not automatically activate all three downstream skills. A new signal must justify each handoff.

## Relationship With Other Adaptive Skills

- `adaptive-failure-analysis` supplies the diagnostic failure context.
- `mutation-policy` controls bounded representation variants.
- `response-differential` evaluates whether paired responses differ meaningfully.
- `technique-matcher` selects the appropriate registered technique when transformation evidence changes the hypothesis.
- `waf-evasion` is only appropriate when evidence supports intermediary filtering and a registered technique is justified.

This skill explains **how input representation appears to change**; it does not independently establish exploitability.

## Safety and Quality Rules

- Preserve the original baseline.
- Never claim a transformation without observable evidence.
- Never assume WAF/CDN involvement from encoding behavior alone.
- Keep observations separate from hypotheses.
- Never fabricate transformed values or response evidence.
- Avoid multi-variable mutations unless explicitly justified.
- Keep authentication and authorization context stable.
- Do not exceed bounded transformation/recheck limits.
- Prefer stopping over speculative transformation chains.
