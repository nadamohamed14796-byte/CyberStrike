# Hunting Prioritization

## Priority tiers

- **P1** — high-value authenticated/business-critical functionality, authorization boundaries, sensitive data/export/admin/account-management paths, newly changed attack surface.
- **P2** — meaningful API/UI functionality with strong contextual signals.
- **P3** — lower-risk or lower-confidence surface requiring targeted validation.
- **P4** — informational/low-value surface or exhausted/weak signals.

## Priority inputs

Priority is a bounded combination of:

- attack-surface relevance
- endpoint/function sensitivity
- authentication/authorization context
- technology-specific signals
- changed JS
- historical confirmed findings
- historical false positives
- new attack surface
- business-logic relevance
- validation progress

## Signal hierarchy

Evidence > Context > Function > Technology > Parameter > Keyword.

A keyword alone cannot activate an intensive vulnerability workflow.

## Adaptive strategy ladder

Prefer unexplored strategy classes:

A parameter variation
B encoding/representation
C HTTP method
D content type
E request shape
F authorization/account context
G identifier variation
H path variation
I header behavior
J legitimate application workflow
K framework/parser behavior
L alternate legitimate client flow

The attempt engine records the selected strategy, reason, result and next action.
