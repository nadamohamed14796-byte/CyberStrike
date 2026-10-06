---
name: adaptive-response-differential
description: Compare baseline and variant responses using signal-driven evidence, controlled pairing, reproducibility, and explicit promotion gates.
category: adaptive-testing
version: "2.0.0"
author: CyberStrike
tags: [adaptive-testing, response-differential, evidence, validation, reproducibility]
tech_stack: [http, web]
cwe_ids: []
chains_with: [adaptive-failure-analysis, mutation-policy, transformation-analysis, technique-matcher]
prerequisites: [adaptive-failure-analysis]
severity_boost: {}

activation:
  mode: signal-driven
  signals:
    - differential-followup
    - variant-response-received
    - response-anomaly
    - transformation-result
    - mutation-result
    - baseline-comparison-requested
  confidence_threshold: 0.70
  require_paired_evidence: true

comparison_policy:
  require_baseline: true
  require_variant: true
  require_provenance: true
  require_reproducibility_for_promotion: true
  max_rechecks: 2
  stop_on_identical_results: true

promotion:
  levels:
    - no-meaningful-difference
    - observable-difference
    - reproducible-difference
    - security-relevant-evidence
  exploitability_requires_separate_validation: true
---

# Adaptive Response Differential

## Purpose

Determine whether a variant produced a meaningful, reproducible change in application behavior without treating a response difference as proof of a vulnerability.

This skill is an **evidence-comparison and promotion gate**, not an exploitability engine.

Required flow:

`signal → pair baseline/variant → normalize comparison → identify differences → assess significance → reproduce when justified → promote or stop`

## Activation

Activate only when the runtime has a concrete comparison signal.

Valid signals include:

- `differential-followup`
- `variant-response-received`
- `response-anomaly`
- `transformation-result`
- `mutation-result`
- `baseline-comparison-requested`

Do **not** activate merely because:

- two requests exist;
- a WAF/CDN is present;
- a response has a different status code without paired provenance;
- a scanner reports an anomaly;
- timing differs once;
- a payload was accepted.

The runtime must provide references to the paired baseline and variant evidence.

## Required Inputs

Require, when available:

- authorization and scope state;
- baseline request/response reference;
- variant request/response reference;
- parent mutation/transformation reference;
- account/session/authentication context;
- relevant request location and parameter;
- previous differential results;
- triggering signal;
- remaining recheck budget.

If either response is missing, unpaired, or unverifiable, return `stop`.

## Pairing and Provenance

Every comparison must preserve the relationship:

`baseline → parent test → mutation/transformation → variant`

Record:

- baseline request ID;
- baseline response ID;
- variant request ID;
- variant response ID;
- parent mutation/transformation ID;
- target/endpoint reference;
- account/session context;
- timestamp metadata where relevant.

Do not compare unrelated requests and call the result a differential.

## Comparison Dimensions

Compare only dimensions relevant to the active hypothesis:

### HTTP behavior

- status code;
- redirect chain;
- response headers;
- content type;
- cache indicators;
- authentication/authorization behavior.

### Body behavior

- response length;
- structural shape;
- JSON/XML fields;
- error class;
- parser messages;
- controlled markers/reflections;
- relevant semantic fields.

### Timing

Use timing only when explicitly justified.

A single slower/faster response is weak evidence. Prefer repeated paired measurements and control for obvious network/tool variance.

### Security context

Check whether the difference is associated with:

- authentication state;
- account identity;
- authorization level;
- session state;
- CSRF/token context;
- target resource identity.

A difference caused by changed authentication context must not be attributed to the mutation.

## Normalization

Before comparing, normalize only factors that are known to be nondeterministic or irrelevant to the hypothesis.

Possible normalization includes:

- timestamps;
- request IDs;
- dynamic tokens;
- generated trace IDs;
- nondeterministic ordering when semantically irrelevant.

Never normalize away the exact field or behavior being tested.

Record what was normalized and why.

## Difference Classification

Classify the observed result as one of:

- `NO_DIFFERENCE`
- `EXPECTED_DIFFERENCE`
- `NON_SECURITY_DIFFERENCE`
- `UNREPRODUCED_DIFFERENCE`
- `REPRODUCIBLE_DIFFERENCE`
- `SECURITY_RELEVANT_DIFFERENCE`
- `INCONCLUSIVE`

A status-code change alone does not determine the classification.

## Significance Gate

Ask:

1. Is the difference reproducible?
2. Is it tied to the tested mutation or transformation?
3. Could authentication/session state explain it?
4. Could normal application nondeterminism explain it?
5. Does it distinguish between the active hypotheses?
6. Is the evidence preserved and attributable?
7. Does it justify a bounded next step?

If the answer is no and no new information can reasonably be obtained, stop.

## Reproducibility

For potentially meaningful differences:

1. Preserve the original pair.
2. Repeat only when justified.
3. Keep the same relevant context.
4. Change only the minimum necessary variable.
5. Compare the repeated pair against the original pair.

Default maximum: **2 rechecks**.

Do not enter an infinite recheck loop.

A difference that disappears on recheck should normally be classified as `UNREPRODUCED_DIFFERENCE`, unless new evidence explains the variance.

## Structured Output

Produce:

```
response_differential:
  outcome: no-difference | changed | inconclusive
  classification: <classification>
  confidence: 0.00
  baseline:
    request_ref: <ref>
    response_ref: <ref>
  variant:
    request_ref: <ref>
    response_ref: <ref>
  parent:
    mutation_ref: <ref-or-null>
    transformation_ref: <ref-or-null>
  differences:
    - dimension: <status|headers|body|timing|auth-context|other>
      observation: <fact>
      significance: low | medium | high
  normalization:
    applied: true | false
    fields:
      - <field>
    reason: <reason>
  reproducibility:
    required: true | false
    rechecks: <integer>
    result: reproduced | not-reproduced | not-tested
  attribution:
    mutation_supported: true | false | unknown
    alternative_explanations:
      - <explanation>
  next_action:
    type: stop | mutation-policy | transformation-analysis | technique-matcher | validation
    reason: <why>
  evidence_refs:
    - <ref>
```

Confidence describes the strength of the differential evidence, not vulnerability severity.

Suggested confidence interpretation:

- 0.00–0.39: weak/inconclusive
- 0.40–0.69: plausible
- 0.70–0.89: strong reproducible signal
- 0.90–1.00: highly supported differential

## Promotion Rules

Use these levels:

### 1. no-meaningful-difference

No useful behavior change was observed.

Action: stop unless a new hypothesis exists.

### 2. observable-difference

A measurable difference exists but attribution or reproducibility is insufficient.

Action: bounded recheck or stop.

### 3. reproducible-difference

The same relevant difference occurs under controlled paired testing.

Action: pass evidence to the appropriate validation skill.

### 4. security-relevant-evidence

The difference is reproducible, attributable to the tested condition, and materially relevant to a security hypothesis.

Action: emit a validation signal. Do **not** declare a vulnerability automatically.

Exploitability, impact, and severity require separate validation.

## Handoff Contract

When handing off, pass:

- structured differential result;
- paired request/response references;
- parent mutation/transformation lineage;
- normalized fields;
- alternative explanations;
- confidence;
- remaining recheck budget;
- reason for the next action.

Do not silently reset budgets or discard the original baseline.

Only emit a new downstream signal when the comparison materially changes the evidence state.

## Relationship With Other Adaptive Skills

- `adaptive-failure-analysis` explains why a baseline test failed and supplies diagnostic context.
- `mutation-policy` controls whether a bounded variant is allowed.
- `transformation-analysis` analyzes representation/normalization behavior.
- `technique-matcher` can select another technique when the current hypothesis is poorly supported.
- This skill determines whether paired responses contain meaningful evidence.

The differential skill must not replace exploitability validation.

## Safety and Quality Rules

- Preserve paired evidence and complete provenance.
- Never fabricate or infer missing response data.
- Never treat a status-code difference as a vulnerability by itself.
- Never attribute a difference to a WAF without supporting evidence.
- Never use timing as strong evidence from a single observation.
- Do not normalize away security-relevant behavior.
- Keep authentication and authorization context controlled.
- Prefer stopping over unsupported promotion.
