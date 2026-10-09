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

- [api-sec](../../api/api-sec/SKILL.md)
- [auth-sec](../../auth/auth-sec/SKILL.md)
- [file-access-vuln](../../file-access-vuln/SKILL.md)

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


## Application Function-Walk / Behavioral Model

Before attacking business logic, build a behavioral model by systematically interacting with every in-scope reachable application function that can be exercised safely.

### Function-Walk Objective

Do not infer the business model only from endpoints, JavaScript, or documentation. For each reachable UI/API function:

1. Open/click the function or invoke its corresponding in-scope request.
2. Record what the application expects before the action.
3. Record the normal request, response, state change, side effect, and next allowed action.
4. Identify the business invariant that appears to make the action valid.
5. Test the logical inverse or boundary of that behavior only when safe and within scope.
6. Put both the expected behavior and the inverse hypothesis into the attack-surface model.

The goal is to learn how the application is supposed to work before asking how it can be made to work incorrectly.

### Function Inventory

Maintain one canonical inventory with at least:

| Field | Meaning |
|---|---|
| function_id | Stable identifier for the UI/API function |
| surface | UI, API, mobile, webhook, background-triggered flow |
| location | Page, component, route, endpoint, or action |
| preconditions | Required state, role, identity, balance, ownership, prior step |
| normal_action | Exact user action/request |
| expected_result | Expected response and state transition |
| side_effects | Balance, inventory, status, email, notification, webhook, etc. |
| business_invariant | Rule that should remain true |
| next_valid_states | States reachable after normal execution |
| identity_context | User/role/tenant involved |
| evidence | Request/response/UI artifact references |
| inverse_hypotheses | Controlled ways the rule might fail |
| attack_surface_refs | Links to generated attack-surface entries |
| confidence | Observed / inferred / unknown |

### Normal-vs-Inverse Analysis

For every function, create a pair:

Normal:
precondition → action → expected state → side effect

Inverse:
remove or alter one precondition → same action → observe whether the forbidden state or side effect occurs

Examples of inverse questions:

- Required step: can the next step be called before it?
- Required ownership: can another user's object be supplied?
- Required role: can the same function be invoked by a lower role?
- One-time action: can it be replayed?
- Positive amount: what happens at zero, negative, fractional, or boundary values?
- State transition: can a finalized state return to an editable state?
- Required approval: can the post-approval action run before approval?
- Server-calculated value: does changing the client value alter the authoritative result?
- Single-use benefit: can concurrent requests consume it more than once?
- Tenant binding: can an identifier from another tenant be accepted?
- Cancellation/refund: can a terminal action be repeated or reordered?
- Rate/limit: can the same logical action be performed concurrently or through another endpoint?

Do not blindly generate all variants. Select the inverse hypothesis from the observed business invariant and available evidence.

### Attack-Surface Matrix

Every completed function-walk MUST feed a structured attack-surface matrix:

| Function | Normal invariant | Inverse hypothesis | Relevant skill | Evidence state |
|---|---|---|---|---|
| function/action | what must be true | what happens if false | business-logic/auth/api/etc. | observed/candidate/validated |

Also classify each function against:

- state-transition abuse
- authorization/ownership
- role/tenant boundary
- parameter/value trust
- replay/idempotency
- race/TOCTOU
- quota/rate/limit
- pricing/discount/refund/credit
- workflow ordering
- alternate endpoint/channel
- client/server trust boundary
- side-effect duplication
- time/date/expiry assumptions

### Coverage Gate

Do not mark business-logic reconnaissance complete because endpoints were discovered.

Mark it complete only when each reachable in-scope business function is:

- exercised normally or explicitly marked blocked/unreachable;
- assigned an expected behavior;
- assigned at least one evidence-based inverse hypothesis when applicable;
- linked to the attack-surface matrix;
- linked to the request/state evidence that supports the model.

If the application has many functions, process them in bounded batches and persist the inventory after each batch. Prioritize state-changing, financial, identity, permission, approval, quota, and multi-step functions first.

### Safe Interaction Rules

"Click every function" means systematically exercise every in-scope reachable function, not blindly submit destructive actions.

For destructive/high-impact functions such as delete, payout, refund, purchase, account closure, permission changes, or irreversible actions:

- capture and model the request/confirmation flow;
- do not execute irreversible impact merely for coverage;
- use a safe test account/test object or program-approved test path when available;
- mark the function modeled-not-executed when execution is unsafe or prohibited;
- never treat a blocked destructive action as evidence of a vulnerability.

### Persistence and Handoff

Persist the function inventory and attack-surface matrix as first-class target artifacts. Reuse them across sessions and hand them to:

- auth-sec for identity/session/authorization invariants;
- api-sec for API-specific functions and object/function authorization;
- offensive-api-abuse for transactional API abuse;
- offensive-business-logic for race, ordering, replay, and deeper business-state testing;
- specialized skills when a function exposes another concrete security signal.

Do not rediscover the same function independently in each specialist.

