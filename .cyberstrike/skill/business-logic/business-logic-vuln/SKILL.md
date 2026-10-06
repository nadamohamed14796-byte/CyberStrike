---
name: business-logic-vuln
description: >-
  Entry P1 category router for business logic testing. Use when workflow abuse,
  race conditions, pricing flaws, or multi-step state attacks matter more than
  parser-level input injection.
---

# Business Logic Router

This is the routing entry point for business-logic and state-machine issues.

## When to Use

- The target involves coupons, inventory, payment, approvals, quotas, invites, trials, or state transitions
- The issue is not parser-level; it is about when checks happen and which business conditions are checked
- You suspect race conditions, workflow bypass, price tampering, negative values, stacked discounts, or multi-step flaws

## Skill Map

- [Business Logic Vulnerabilities](../business-logic-vulnerabilities/SKILL.md)

## Recommended Flow

1. First map key business states and one-time actions
2. Then check for check-then-act windows, sequence dependencies, or missing cross-step authorization
3. If the chain depends on APIs, uploads, or object permissions, return to the corresponding router skill to complete the path

## Related Categories

- [api-sec](../api-sec/SKILL.md)
- [auth-sec](../auth-sec/SKILL.md)
- [file-access-vuln](../file-access-vuln/SKILL.md)

---

Source: https://github.com/yaklang/hack-skills
License: MIT (Copyright (c) 2026 VillanCh)
Adapted for CyberStrike skill runtime. Imported as SKILL.md only; supplementary upstream files are not included.


## Extended Signal-Driven Orchestration

`business-logic-vuln` is the single business-logic routing entry point. Keep `business-logic-vulnerabilities` as the detailed playbook and `offensive-business-logic` as a specialized methodology; do not activate all three from a generic keyword.

### Concrete Activation Signals

| Signal | Score | Route |
|---|---:|---|
| Multi-step transactional workflow observed | 5 | business-logic-vulnerabilities |
| Explicit state transition / state-machine boundary | 5 | business-logic-vulnerabilities |
| Price, quantity, currency, discount, coupon, credit or refund fields | 5 | business-logic-vulnerabilities |
| One-time action or idempotency behavior | 5 | offensive-business-logic |
| Concurrent duplicate requests / TOCTOU evidence | 5 | offensive-business-logic |
| Role/tenant/business-state mismatch | 5 | business-logic-vulnerabilities + auth-sec/api-sec as needed |
| Authenticated API transaction with business impact | 5 | api-sec → offensive-api-abuse → business logic |
| Generic words such as business, order, payment, cart without observed behavior | 0 | do not activate |

### Routing

- Use `business-logic-vulnerabilities` for broad state-machine, pricing, coupon, payment, workflow, and parameter-trust analysis.
- Use `offensive-business-logic` when concrete evidence points to race/TOCTOU, repeated side effects, cross-role invocation, or deeper transactional abuse.
- Use `auth-sec` for identity/session/role enforcement questions and `api-sec` for API surface/security context; do not duplicate their discovery work.
- Use `offensive-api-abuse` when an API business-flow abuse path is already established; business-logic remains the logic-analysis branch.

### Evidence Gate

Require: baseline behavior → controlled mutation or concurrency test → reproducible state/financial/authorization impact → finding. Endpoint existence, client-side hidden fields, status-code differences, or a suspicious numeric value alone are not findings.

### Anti-Duplicate Policy

Maintain one canonical workflow/state inventory per target. Do not run `business-logic-vulnerabilities` and `offensive-business-logic` in parallel unless the second branch has a distinct unanswered question. Reuse captured API requests and state transitions. Do not rediscover the same endpoint from multiple routers.

### Handoff Contract

Pass scope, workflow name, endpoint/method, state before and after, identity/role/tenant, request/response artifacts, business invariant being tested, exact trigger signal, prior mutations, concurrency parameters when applicable, and expected proof.

### Bounded Execution

- Prefer one baseline plus one controlled mutation at a time.
- For race testing, start with the smallest safe concurrency that can answer the question and respect program limits.
- Stop after three materially equivalent attempts without new evidence.
- Preserve partial state/artifacts after failure; retry only the affected branch.

### Cross-Router Relationship

`API signal → api-sec`; `authenticated transactional abuse → api-sec → offensive-api-abuse`; `business-state signal → business-logic-vuln`; `identity/authorization signal → auth-sec`. When multiple signals coexist, share the canonical inventory instead of launching independent discovery.

### Coverage Checklist

Record `tested`, `not-applicable`, or `blocked` for: workflow/state transitions, authorization at each transition, price/quantity/currency, discounts/coupons, refunds/credits, idempotency/replay, race/TOCTOU, quota/limits, role/tenant boundaries, hidden/internal transitions, and cross-router API/auth dependencies.
