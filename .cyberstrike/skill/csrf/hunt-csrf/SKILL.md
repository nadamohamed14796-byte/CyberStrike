---
name: hunt-csrf
description: >-
  Signal-driven modern CSRF hunting for SameSite edge cases, token-validation
  failures, JSON/simple-content-type CSRF, login/account-linking CSRF, OAuth
  state binding, and chains with CORS, XSS, or clickjacking.
category: web-testing
verified: official
tags: [bug-bounty, security-testing, hunt, csrf, signal-driven]
tech_stack: [web, http, javascript]
cwe_ids: [CWE-352]
chains_with: [csrf-sec, csrf-cross-site-request-forgery, cors-sec, auth-sec, clickjacking, xss-cross-site-scripting]
files: [SKILL.md]
---

# hunt-csrf

## Purpose
Hunt modern CSRF only when concrete traffic or application behavior indicates a
browser state-change boundary.

## Activation signals
Strong signals: authenticated cookie-driven state change; missing/incorrect
CSRF validation; SameSite behavior plausibly permitting delivery; browser-
sendable content-type mismatch; Origin/Referer edge case; login/account-link/
OAuth state-binding weakness; or concrete CORS/XSS/clickjacking chain evidence.

Non-signals: generic CSRF keyword, scanner output without reproduction,
read-only public endpoints, or token presence without validation-failure evidence.

## Workflow
1. Confirm authorization and scope.
2. Record the triggering signal.
3. Establish the normal authenticated state transition.
4. Build one minimal cross-site hypothesis.
5. Validate with a test identity and reversible synthetic state change.
6. Preserve browser/request/response evidence and identity context.
7. Route cross-layer chains only when evidence supports them.

## Variant matrix
- token signal: removal, mutation, cross-session binding, lifecycle
- SameSite signal: actual browser credential delivery
- GET/redirect: state-changing semantics and method override
- JSON: browser-sendable content type and actual parsing
- multipart: parser/content-type differential
- login/account link: identity binding
- OAuth callback: state/nonce/account binding; use OAuth specialist when primary
- CORS: distinguish credentialed sending from response readability
- XSS/clickjacking: only when they are concrete prerequisites

## Evidence gate
signal -> observed policy weakness -> cross-site delivery ->
reproduced state change -> impact proven

Do not report token absence, SameSite settings, or scanner labels alone.

## Routing
Use csrf-sec for orchestration and csrf-cross-site-request-forgery for the
comprehensive playbook. Route CORS, authentication, API, clickjacking, or XSS
to their canonical specialists when those boundaries are primary.

## Bounds
Deduplicate by target, endpoint, method, identity context, CSRF control and
delivery mode. Prefer one primary path and a small number of evidence-driven
variants. Stop when reproduced or disproven.

## Safety
Authorized targets only. Prefer test accounts, synthetic data and reversible
state changes. Avoid destructive actions and unrelated user data.

## Provenance
Adapted from public research already present in this repository and normalized
for CyberStrike's signal-driven routing model.
