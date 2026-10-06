---
name: reference-learning
description: Persistent learning layer for using security reference skills without mutating their source definitions. Records skill usage and outcomes, ranks useful references, and feeds learned signals into future routing.
category: meta
tags:
  - learning
  - references
  - skill-routing
  - feedback
  - false-positive-control
verified: official
---

# Reference Learning

Use the security skill library as a reference corpus and learn from outcomes without rewriting source skills.

## Lifecycle

1. Discover relevant reference skills from signal, technology, CWE, phase, and asset.
2. Load only the skills needed for the current hypothesis.
3. Apply their methodology and validation gates.
4. Record useful when a reference materially improved the test plan.
5. Record finding when the reference directly contributed to a confirmed finding.
6. Record rejected when the technique was inapplicable.
7. Record disproven when the hypothesis was tested and falsified.
8. Let persistent learning change future ranking, not SKILL.md contents.

## Boundaries

- Never edit a reference skill because of runtime learning.
- Preserve source and license provenance.
- Do not promote a community reference to official doctrine.
- Do not treat frequency of use as proof of correctness.
- Validation evidence always outranks learned usefulness.
- A low-usefulness skill may still be selected when its signal, prerequisite, or chain match is strong.

## Integration

The runtime learning layer participates in skill loading, skill suggestions, kill-chain follow-up, agent delegation context, and future sessions.
