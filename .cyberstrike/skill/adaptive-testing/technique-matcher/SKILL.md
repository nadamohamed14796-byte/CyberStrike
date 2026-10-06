---
name: adaptive-technique-matcher
description: Rank registered security techniques against validated signals, target context, evidence, history, prerequisites, and bounded execution policy.
category: adaptive-testing
version: "2.0.0"
author: CyberStrike
tags: [adaptive-testing, technique-selection, ranking, context, evidence, signals]
tech_stack: [http, web]
cwe_ids: []
chains_with: [adaptive-failure-analysis, transformation-analysis, mutation-policy, response-differential, waf-evasion]
prerequisites: [adaptive-failure-analysis]
severity_boost: {}

activation:
  mode: signal-driven
  signals:
    - technique-selection-requested
    - technique-mismatch
    - failure-analysis-handoff
    - transformation-result
    - differential-result
    - new-technology-signal
    - hypothesis-changed
  confidence_threshold: 0.70
  require_registered_techniques: true

ranking:
  max_candidates: 5
  require_evidence_for_positive_score: true
  prefer_existing_skills: true
  reject_out_of_scope: true
  reject_missing_prerequisites: true
  deduplicate_candidates: true

selection:
  max_primary_technique: 1
  max_supporting_techniques: 2
  require_explicit_reason: true
  require_bounded_cost: true
---

# Adaptive Technique Matcher

## Purpose

Select the best existing registered security technique for the current hypothesis and evidence state.

This skill is a **selection and routing layer**, not a technique generator. It must choose from registered CyberStrike skills and must never invent an unregistered technique at runtime.

Required flow:

`signal → validate context → collect candidates → filter → rank → select → handoff`

## Activation

Activate only when a concrete routing signal exists.

Valid signals include:

- `technique-selection-requested`
- `technique-mismatch`
- `failure-analysis-handoff`
- `transformation-result`
- `differential-result`
- `new-technology-signal`
- `hypothesis-changed`

Do **not** activate merely because:

- a target exists;
- a broad vulnerability category is present;
- a WAF/CDN is detected;
- a payload failed;
- a technology name appears without a technique-relevant signal.

The router must provide the context and evidence that caused selection to be requested.

## Required Inputs

Before ranking candidates, require:

- authorization and scope state;
- target/endpoint context;
- active vulnerability/security hypothesis;
- current signal;
- failure profile when available;
- transformation profile when available;
- differential result when available;
- previous technique outcomes;
- registered skill index/metadata;
- prerequisites and activation requirements;
- current mutation/adaptive budget.

If critical context is missing, return `stop` rather than guessing.

## Candidate Discovery

Candidates must come from the registered skill inventory.

For every candidate, inspect:

- skill name and canonical identity;
- category and tags;
- technology/protocol coverage;
- prerequisites;
- activation signals;
- scope requirements;
- known chains;
- expected cost/noise;
- prior outcome history when available.

Never create a synthetic skill name or route to a file that is not registered.

## Filtering Gates

Reject a candidate when any of the following is true:

- outside authorized scope;
- required technology/protocol is not supported;
- required prerequisite signal is absent;
- required evidence is missing;
- candidate is disabled or unavailable;
- candidate duplicates a stronger canonical candidate;
- policy/budget forbids execution;
- candidate would require speculative assumptions.

Filtering happens **before** ranking.

## Ranking Model

Rank surviving candidates using explicit evidence rather than broad keyword matching.

Suggested weighted model:

`score = context_match + signal_match + evidence_match + provenance + history + feasibility - noise - cost - uncertainty`

Use normalized scores from **0.00 to 1.00**.

Recommended priorities:

1. Exact vulnerability/context match.
2. Direct signal compatibility.
3. Evidence supporting the technique.
4. Existing canonical skill provenance.
5. Positive historical results.
6. Low execution noise and bounded cost.
7. Low uncertainty.

A high score is not proof that the technique will succeed.

## Candidate Record

Each candidate should be represented as:

```
candidate:
  skill: <registered-skill>
  canonical: true | false
  score: 0.00
  evidence_refs:
    - <ref>
  matching_signals:
    - <signal>
  prerequisites:
    satisfied: true | false
    missing:
      - <signal-or-requirement>
  reasons:
    - <reason>
  expected_cost: low | medium | high
  expected_noise: low | medium | high
  action: eligible | reject
  rejection_reason: <reason-or-null>
```

## Selection Policy

After filtering and ranking:

- Select **one primary technique**.
- Supporting techniques are optional and limited to two.
- Supporting techniques must have an explicit dependency or diagnostic purpose.
- Do not activate multiple overlapping techniques merely because they score well.
- Prefer the canonical specialized skill over a broad mega-skill when both address the same hypothesis.
- Keep broad/reference skills available for fallback, documentation, or explicit operator request, but do not activate them from generic technology keywords.

For example:

`Kerberos signal → canonical Kerberos skill`

not:

`Kerberos signal → Kerberos skill + broad AD mega-skill + duplicate Kerberos skill`

## Deduplication

Deduplicate by canonical skill identity, not filename alone.

If several skills cover the same technique:

1. prefer the canonical specialized skill;
2. prefer stronger direct signal match;
3. prefer fewer prerequisites;
4. prefer lower noise/cost;
5. use history only as a tie-breaker when evidence quality is comparable.

Do not execute two equivalent candidates to "see which works."

## Structured Output

Return:

```
technique_selection:
  action: select | stop
  signal: <triggering-signal>
  hypothesis: <current-hypothesis>
  primary:
    skill: <registered-skill-or-null>
    score: 0.00
    reason: <why-selected>
  supporting:
    - skill: <registered-skill>
      score: 0.00
      reason: <diagnostic/dependency-purpose>
  rejected:
    - skill: <registered-skill>
      reason: <why-rejected>
  evidence_refs:
    - <ref>
  prerequisites:
    satisfied: true | false
    missing:
      - <requirement>
  budget:
    remaining: <value>
  next_action:
    type: execute | mutation-policy | response-differential | transformation-analysis | stop
    reason: <why>
```

If no candidate has sufficient evidence or score, return `stop`.

Do not force a selection just to keep the workflow moving.

## Handoff Contract

When selecting a technique, pass:

- structured `technique_selection`;
- active hypothesis;
- evidence references;
- failure/transformation/differential profiles;
- selected skill prerequisites;
- remaining adaptive budget;
- reason and expected observation;
- parent test reference.

The downstream skill must preserve these inputs and must not silently reset budgets or broaden scope.

If the selected technique fails materially, emit a new signal for failure analysis or another appropriate routing stage instead of automatically selecting another technique.

## Relationship With Other Adaptive Skills

- `adaptive-failure-analysis` diagnoses why a test failed.
- `transformation-analysis` explains representation/normalization behavior.
- `mutation-policy` controls bounded variants.
- `response-differential` evaluates paired response changes.
- `waf-evasion` may be selected only when evidence supports an intermediary filtering hypothesis.

This matcher decides **which registered technique should run next**; it does not execute or invent techniques.

## Safety and Quality Rules

- Scope is a hard gate, not a ranking factor.
- Evidence is required for positive selection.
- Never fabricate a skill, prerequisite, signal, or historical result.
- Never promote a scanner label into a technique decision without supporting evidence.
- Never select a technique solely because a keyword matches.
- Prefer canonical specialized skills over overlapping mega-skills.
- Keep activation signal-driven to prevent unnecessary skill loading.
- Preserve provenance and budget across handoffs.
- Prefer `stop` when evidence is insufficient.
