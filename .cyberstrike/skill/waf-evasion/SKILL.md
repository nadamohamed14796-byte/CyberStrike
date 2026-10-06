---

name: waf-evasion
description:
Evidence-driven analysis of web filtering, intermediary processing,
normalization, encoding, and parser differentials during authorized
security testing.
category: input-validation
version: "2.0.0"
author: CyberStrike
tags: [waf, evasion, filter-analysis, intermediary-analysis, encoding, normalization, parser-differential, adaptive-testing]
tech_stack: [http, web]
cwe_ids: []
chains_with: [adaptive-failure-analysis, transformation-analysis, adaptive-technique-matcher, adaptive-mutation-policy, adaptive-response-differential]
prerequisites: [adaptive-failure-analysis, transformation-analysis]
severity_boost: {}
---

# WAF Evasion

## High-Level Description

Use this skill when an authorized web security test has already attempted a baseline technique and the observed behavior suggests filtering, intermediary processing, normalization, encoding, or parser differences.

This is a cross-vulnerability adaptive skill.

It does not replace vulnerability-specific skills such as XSS, SQLi, SSTI, CMDi, XXE, or NoSQL injection.

The originating vulnerability skill remains responsible for:

* vulnerability-specific testing
* exploitability validation
* impact assessment
* final finding validation

This skill is responsible for:

* analyzing why a baseline request failed
* distinguishing application rejection from intermediary filtering
* identifying observable transformations
* selecting existing registered techniques
* applying bounded adaptive testing
* comparing responses with the baseline
* returning evidence to the originating vulnerability skill

A failed payload does not automatically indicate a WAF.

---

## When to Use

Load this skill when:

* A baseline vulnerability technique has already been attempted.
* The request is confirmed in scope.
* Authorization is known.
* The baseline request and response are preserved.
* The failed behavior contains useful filtering or intermediary signals.
* Additional testing could distinguish between competing hypotheses.

Do not load this skill simply because:

* a payload failed
* the application returned an error
* the status code changed once
* the expected vulnerability was not triggered
* a request was rejected without evidence explaining the rejection

---

## Required Context

Before adaptive analysis, preserve:

| Context                        | Required |
| ------------------------------ | -------- |
| Target scope                   | Yes      |
| Authorization state            | Yes      |
| Baseline request               | Yes      |
| Baseline response              | Yes      |
| Failed request                 | Yes      |
| Failed response                | Yes      |
| Input location                 | Yes      |
| Authentication/session context | Yes      |
| Original vulnerability class   | Yes      |

The baseline must remain immutable so every adaptive request can be compared against it.

---

## Failure Classification

Classify the observed behavior into the most likely category:

| Classification           | Meaning                                                       |
| ------------------------ | ------------------------------------------------------------- |
| `application-validation` | Application rejected or transformed the input                 |
| `waf-or-intermediary`    | Filtering or intermediary processing is supported by evidence |
| `parser-differential`    | Different parser behavior is observable                       |
| `normalization-mismatch` | Canonicalization or normalization differs between layers      |
| `encoding-mismatch`      | Encoding or decoding differs between layers                   |
| `backend-rejection`      | Backend rejected the processed input                          |
| `unknown`                | Evidence is insufficient                                      |

Maintain alternative hypotheses when confidence is low.

Example:

```yaml
classification: waf-or-intermediary
confidence: 0.81
alternative_hypotheses:
  - application-validation
signals:
  - block-response
  - response-template-change
  - consistent-rejection
```

Never report `waf-or-intermediary` as confirmed solely because a payload was blocked.

---

## Detection Signals

Look for observable signals such as:

| Signal                   | What to Compare                         |
| ------------------------ | --------------------------------------- |
| Status change            | Baseline vs variant status              |
| Response template change | Application response vs block response  |
| Block page               | Known intermediary/block behavior       |
| Header change            | Added or removed intermediary headers   |
| Body marker change       | Consistent filtering markers            |
| Reflection removal       | Input disappears before rendering       |
| Parameter stripping      | Parameter is removed or rewritten       |
| Request rewriting        | Observable representation changes       |
| Parser error             | Different parser behavior               |
| Normalization change     | Case, whitespace, or delimiter behavior |
| Encoding change          | Input representation changes            |
| Timing difference        | Only when reproducible and controlled   |

Each signal should be supported by evidence.

Do not infer a WAF from a single weak signal when application-side validation is equally plausible.

---

## Baseline Analysis

Establish a clean baseline before adaptive testing.

Record:

```yaml
baseline:
  request_fingerprint: ""
  response_fingerprint: ""
  status_code: ""
  response_size: ""
  headers: []
  body_markers: []
  auth_context: ""
  input_location: ""
```

Preserve:

```text
baseline request
baseline response
failed request
failed response
```

Do not mutate or overwrite the original baseline.

---

## Transformation Analysis

Determine whether the input appears to be:

* decoded
* encoded
* normalized
* canonicalized
* stripped
* rewritten
* parsed differently
* rejected before application processing

For each transformation distinguish:

```text
observed
suspected
unknown
```

Example:

```yaml
transformation:
  type: normalization
  status: observed
  confidence: 0.78
  evidence:
    - response-id-123
    - response-id-124
```

Prefer the smallest test capable of distinguishing competing hypotheses.

Do not assume that a decoder, normalizer, parser, or WAF exists without evidence.

---

## Technique Selection

Do not invent an uncontrolled technique.

Use:

* `adaptive-technique-matcher`
* existing vulnerability skills
* existing registered techniques
* existing learning signals

Technique selection should consider:

1. Original vulnerability class
2. Input location
3. Failure classification
4. Transformation evidence
5. Skill tags
6. Technique prerequisites
7. Previous outcomes
8. Historical learning signals
9. Available testing budget

Prefer techniques that are:

* already registered
* directly supported by observed behavior
* relevant to the originating vulnerability
* previously useful in similar contexts
* low-noise and bounded

Reject techniques that are:

* out of scope
* unsupported by evidence
* duplicates
* missing prerequisites
* prohibited by policy
* outside the mutation budget

---

## Technique Families

Use technique families only for reasoning and matching.

The actual implementation must reference an existing registered technique.

Common families include:

### Encoding

* URL encoding
* controlled repeated encoding
* Unicode representation differences

### Normalization

* case normalization
* whitespace normalization
* delimiter normalization
* canonicalization differences

### Parser Differences

* parser differential
* content-type differential
* representation differential

### Input Representation

* parameter representation
* body representation
* header representation

Do not interpret these families as permission to generate unlimited mutations.

---

## Bounded Adaptive Testing

Every adaptive request must have a reason.

Track:

```yaml
mutation:
  parent_technique: ""
  transformation: ""
  reason: ""
  depth: 0
  request_fingerprint: ""
  expected_signal: ""
```

Rules:

* Prefer one transformation at a time.
* Avoid unnecessary transformation chains.
* Deduplicate equivalent requests.
* Preserve request provenance.
* Preserve baseline comparability.
* Stop when additional mutations provide no useful information.

Default bounded policy:

| Limit                       | Default |
| --------------------------- | ------: |
| Adaptive rounds             |       3 |
| Variants per round          |       4 |
| Transformation depth        |       2 |
| Repeated equivalent results |       2 |

The runtime may impose stricter limits.

---

## Response Differential

Compare every adaptive response with the baseline.

Track:

```yaml
response_differential:
  status_code_changed: false
  response_size_changed: false
  headers_changed: false
  body_structure_changed: false
  block_marker_changed: false
  reflection_changed: false
  parser_behavior_changed: false
  timing_changed: false
```

A response difference is not automatically a vulnerability.

The originating vulnerability skill must validate exploitability before a finding is produced.

---

## Evidence Requirements

A useful adaptive result should contain:

```yaml
evidence:
  baseline_request: ""
  baseline_response: ""
  variant_request: ""
  variant_response: ""
  request_fingerprint: ""
  response_fingerprint: ""
  observed_behavior: []
  confidence: 0.0
```

Preserve enough information to reproduce the observation.

Do not report a bypass solely because:

* status changed
* response length changed
* an error disappeared
* a block page disappeared
* timing changed

The resulting behavior must still be validated against the original vulnerability hypothesis.

---

## Learning Integration

Use CyberStrike's existing learning system.

Do not create a separate WAF learning database.

Return useful signals such as:

```yaml
learning_signal:
  vulnerability_class: ""
  failure_class: ""
  transformation: ""
  technique: ""
  outcome: ""
  confidence: 0.0
  target_context: ""
```

Learning signals may improve future technique ranking.

They must never override:

* scope
* authorization
* prerequisites
* safety policy
* evidence requirements
* mutation limits

Reference skills must remain immutable from learning.

---

## Stop Conditions

Stop adaptive testing when any of the following occurs:

* scope violation
* authorization becomes uncertain
* baseline is unavailable
* evidence becomes incomparable
* mutation budget is exhausted
* transformation depth is exceeded
* equivalent results repeat
* no supported technique remains
* no useful discriminating signal exists
* the originating vulnerability skill has already validated the issue

Do not continue testing merely because previous attempts failed.

---

## Output

Return an adaptive analysis containing:

```yaml
waf_analysis:
  classification: ""
  confidence: 0.0
  filter_profile: {}
  transformation_profile: {}
  ranked_techniques: []
  attempted_variants: []
  response_differentials: []
  evidence: []
  learning_signals: []
  stop_reason: ""
```

Each selected technique should include:

```yaml
technique:
  name: ""
  source_skill: ""
  reason: ""
  prerequisites: []
  expected_signal: ""
  budget_cost: 0
```

Every adaptive request must remain traceable to its originating vulnerability technique.

---

## Quality Checklist

Before returning control to the originating skill:

* [ ] Target is authorized.
* [ ] Request is in scope.
* [ ] Baseline exists.
* [ ] Failure is characterized.
* [ ] Filtering or intermediary behavior has supporting evidence.
* [ ] Alternative hypotheses were considered.
* [ ] Selected technique exists in CyberStrike.
* [ ] Required prerequisites are satisfied.
* [ ] Mutation budget was respected.
* [ ] Equivalent requests were deduplicated.
* [ ] Baseline comparison was preserved.
* [ ] Response differential was recorded.
* [ ] Evidence is reproducible.
* [ ] No vulnerability was inferred from response difference alone.
* [ ] Learning signal is attributable.
* [ ] Stop reason is recorded when testing terminates.

---

## Related Skills

* `adaptive-failure-analysis` — classify why the baseline attempt failed
* `transformation-analysis` — analyze encoding, normalization, and parser behavior
* `adaptive-technique-matcher` — select existing registered techniques
* `adaptive-mutation-policy` — enforce bounded mutations and deduplication
* `adaptive-response-differential` — compare baseline and adaptive responses
* Originating vulnerability skill — perform final vulnerability validation

---

## Core Principle

**Do not assume WAF. Measure behavior, classify the failure, select an existing technique, test within a finite budget, compare against the baseline, and return reproducible evidence to the originating vulnerability skill.**
