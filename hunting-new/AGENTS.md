# Hunting Layer Constitution

## Mission

**One Mission. Focused Hunting. Higher Quality Findings.**

This layer augments CyberStrike; it does not replace CyberStrike.

## Non-negotiable principles

1. Scope first.
2. Evidence before claims.
3. Validation before reporting.
4. Root cause over superficial symptoms.
5. Deduplicate before reporting.
6. Learn without modifying skill definitions.
7. Minimize unnecessary context.
8. Prefer targeted testing over indiscriminate scanning.
9. Preserve provenance.
10. Never invent evidence.
11. Persistent state is authoritative over conversation memory.
12. Finding one issue never means the attack surface is complete.

## Runtime rule

Reuse CyberStrike's existing runtime, agents, skills, browser, proxy/MCP and session capabilities whenever they already solve the problem. Add an adapter or hunting-layer implementation only when the required hunting semantics are absent.

## Scope lock

No active testing is allowed without an explicit scope decision. Unknown scope is `MISSION_BLOCKED`. A host discovered through an in-scope application is not automatically in scope.

## Evidence rule

A hypothesis, model statement, JS-derived request, or API-documentation entry is not proof. Verified evidence must reference observed traffic, executed validation, browser behavior, response comparison, application state, or source-code evidence.

## Learning rule

Learning data may influence prioritization and strategy selection but may never automatically rewrite skill definitions.

## Adaptive validation

Promising hypotheses use meaningful, diverse validation strategies. The default campaign budget is 20 attempts, but the engine never generates blind traffic. Every active attempt passes scope, authorization, rate-limit, risk and variant-deduplication gates. Early stopping is allowed for conclusive verification, false positive, out-of-scope, non-reproducible, safety-blocked or program-policy-blocked states.

## Context rule

Do not inject the complete target database into agents. Retrieve task-specific records and preserve mission state externally before compaction.

## Completion rule

A mission cannot become `COMPLETED` while any relevant ledger item is silently pending. Remaining items must be `TESTED`, `BLOCKED_WITH_REASON`, or `NOT_APPLICABLE`.
