---
name: adaptive-mutation-policy
description: Select and constrain adaptive request mutations using explicit signals, evidence, bounded budgets, deduplication, and measurable information gain.
category: adaptive-testing
version: "2.0.0"
author: CyberStrike
tags: [adaptive-testing, mutation, policy, limits, deduplication, evidence, information-gain]
tech_stack: [http, web]
cwe_ids: []
chains_with: [adaptive-failure-analysis, transformation-analysis, technique-matcher, response-differential]
prerequisites: [adaptive-failure-analysis]
severity_boost: {}

activation:
  mode: signal-driven
  signals:
    - mutation-requested
    - controlled-variant-needed
    - transformation-approved
    - failure-analysis-handoff
    - technique-matcher-handoff
    - differential-followup
  confidence_threshold: 0.70
  require_parent_test: true

budget:
  max_mutations_per_handoff: 3
  max_depth: 2
  max_equivalent_outcomes: 2
  require_information_gain: true
  stop_on_budget_exhaustion: true

deduplication:
  canonicalize_method: true
  canonicalize_url: true
  canonicalize_parameter_order: true
  canonicalize_headers: true
  canonicalize_body: true
  compare_against_prior_variants: true
---

# Adaptive Mutation Policy

## Purpose

Control adaptive request variants so testing remains finite, evidence-driven, scoped, reproducible, and useful.

This skill is a **policy and gating layer**, not a payload generator. It decides whether a mutation is justified, which bounded mutation is permitted, and when mutation must stop.

Required flow:

`signal → parent evidence → mutation rationale → eligibility gate → bounded mutation → compare result → keep/stop`

## Activation

Activate only when the runtime has a concrete mutation signal from an existing security test.

Valid activation signals include:

- `mutation-requested`
- `controlled-variant-needed`
- `transformation-approved`
- `failure-analysis-handoff`
- `technique-matcher-handoff`
- `differential-followup`

Do **not** activate merely because:

- the target has a WAF/CDN;
- a payload failed once;
- a status code is 401/403/406/429 without a mutation hypothesis;
- a technology is present;
- a generic word such as "bypass" appears.

The runtime should pass the parent test reference and the evidence that justified mutation.

## Required Inputs

Before selecting a mutation, require:

- authorization and scope state;
- parent request reference;
- parent response reference;
- parent technique/test identifier;
- failure or differential signal;
- current failure profile when available;
- previous mutation history;
- remaining adaptive budget;
- relevant parameter/location and encoding context;
- account/session context when behavior is identity-dependent.

If the parent evidence is missing or unverifiable, return `stop` rather than inventing a mutation.

## Mutation Eligibility Gate

A mutation is eligible only when all of the following are true:

1. The mutation has a specific hypothesis or diagnostic purpose.
2. The parent request is preserved.
3. The mutation is within authorized scope.
4. The mutation is meaningfully different from prior attempts.
5. The mutation fits the remaining budget.
6. The expected result can distinguish at least one plausible hypothesis.
7. The mutation does not silently combine unrelated transformations unless the handoff explicitly requires a composed test.

If any condition fails, stop.

## Mutation Selection

Prefer the smallest change capable of testing the current hypothesis.

Default order:

1. Single transformation or representation change.
2. Single parameter/location change.
3. Single syntax or delimiter variant.
4. Controlled combination only when a prior result justifies it.

Avoid mutation cascades where several variables change simultaneously. Multi-variable mutations weaken causal attribution and should require an explicit reason.

## Mutation Record

Every selected mutation must produce a structured record:

```
mutation_decision:
  action: mutate | stop
  mutation_id: <stable-id>
  parent_test_ref: <ref>
  parent_mutation_id: <ref-or-null>
  hypothesis: <specific-question>
  rationale: <why-this-mutation>
  transformation:
    type: <type>
    description: <bounded-change>
  expected_observation: <what-result-would-be-informative>
  scope_validated: true
  dedupe_key: <canonical-key>
  budget:
    depth: <integer>
    remaining: <integer>
  information_gain_required: true
  stop_conditions:
    - <condition>
```

The record describes the decision; the execution layer owns the actual request execution.

## Deduplication

Before execution, canonicalize and compare the candidate against prior requests and variants.

Deduplicate equivalent mutations using:

- HTTP method;
- canonicalized URL;
- normalized parameter ordering;
- relevant headers;
- body representation;
- transformation type;
- parent mutation lineage.

A mutation that is semantically equivalent to a prior attempt must not be re-run unless new evidence explicitly changes the hypothesis.

Do not treat a different request identifier, timestamp, or tool invocation ID as a meaningful mutation.

## Information Gain

Every mutation must have a measurable reason to exist.

Useful information gain includes:

- distinguishing application rejection from intermediary filtering;
- distinguishing normalization behavior from payload semantics;
- testing whether a specific parameter/location is treated differently;
- validating whether a response difference is reproducible;
- testing a concrete technique hypothesis selected by the router.

No information gain is present when:

- the expected response is identical and no hypothesis changes;
- the same transformation was already tested;
- the mutation only changes irrelevant formatting;
- the next step is based only on speculation.

Stop when repeated results provide no new evidence.

## Budgets and Stop Conditions

Default limits:

- maximum 3 mutations per handoff;
- maximum mutation depth 2;
- maximum 2 equivalent outcomes before stopping.

Stop immediately on:

- scope or authorization failure;
- unsafe execution condition;
- exhausted budget;
- duplicate/equivalent request;
- missing parent evidence;
- loss of provenance;
- no credible information gain;
- repeated equivalent outcomes.

The runtime may configure tighter limits, but downstream skills must not silently increase the budget.

## Handoff Contract

When mutation is selected, pass:

- `mutation_decision`;
- parent request/response references;
- failure profile or triggering signal;
- mutation lineage;
- dedupe key;
- remaining budget;
- expected observation.

The execution/result layer must return:

- actual request reference;
- actual response reference;
- observed status/headers/body metadata;
- whether the mutation was materially different;
- whether the expected observation occurred;
- evidence references.

If the result materially changes the hypothesis, emit a new signal for the appropriate downstream skill.

Do not automatically activate every adaptive skill after execution. A new signal must justify the next handoff.

## Relationship With Other Adaptive Skills

- `adaptive-failure-analysis` diagnoses the failed baseline and supplies the failure profile.
- `transformation-analysis` evaluates encoding, normalization, and representation behavior.
- `technique-matcher` selects a different technique when the current one is a poor fit.
- `response-differential` evaluates meaningful differences between baseline and variants.
- This skill controls **whether and how a bounded variant is allowed**.

The mutation policy must not replace failure analysis or technique selection.

## Safety and Quality Rules

- Preserve the original baseline request/response.
- Never fabricate evidence or execution results.
- Never claim exploitability from a response difference alone.
- Never infer a WAF solely from a mutation outcome.
- Never use mutation to bypass scope controls.
- Keep provenance for every parent/child variant.
- Prefer fewer high-value variants over large payload permutations.
- Stop rather than continue speculative mutation.
