---
name: csrf-cross-site-request-forgery
description: >-
  CSRF testing playbook for state-changing browser flows, anti-CSRF defenses,
  SameSite behavior, JSON/multipart CSRF, login CSRF, OAuth state handling,
  and concrete cross-origin attack chains.
category: web-application
verified: official
tags: [csrf, cross-site-request-forgery, browser-security, samesite, anti-csrf, signal-driven]
tech_stack: [web, http, javascript]
cwe_ids: [CWE-352]
chains_with: [csrf-sec, hunt-csrf, cors-sec, auth-sec, clickjacking]
files: [SKILL.md]
---

# CSRF — Cross-Site Request Forgery

## Load gate
Load only when concrete evidence indicates a cross-site state-changing boundary:
an authenticated cookie/session action, defective CSRF token validation, relevant
SameSite behavior, browser-sendable state-changing input, Origin/Referer weakness,
login/account-link/OAuth binding weakness, or reproduced cross-site delivery.

Do not activate from the words CSRF/token/SameSite, a scanner label, or a public
read-only endpoint alone.

## Core requirements
A finding normally requires: victim identity/session; attacker-controlled
cross-site delivery; victim authority attached as required; server acceptance;
reproduced state transition; and demonstrated impact.

Missing token or SameSite=None is a candidate, not a finding. CORS request
permission is not the same as response readability; route a primary CORS flaw
to cors-sec.

## Workflow
1. Confirm scope and authorization.
2. Establish the normal authenticated state transition.
3. Capture method, endpoint, cookies, SameSite/Secure/Domain/Path, CSRF token
   location/lifecycle/binding, Origin/Referer policy, content types, redirects,
   method overrides, browser credential behavior, and resulting state.
4. Form one evidence-driven cross-site hypothesis.
5. Validate with a dedicated attacker/test origin and reversible synthetic data.
6. Preserve baseline/mutated request-response pairs and browser evidence.

Test only variants justified by evidence: token removal/mutation or
cross-session substitution; token lifecycle/fixation; Origin/Referer edge cases;
GET/method override; text/plain/multipart; relevant SameSite behavior; and
login/account-link/OAuth state binding.

## JSON and browser-sendability
For JSON-like endpoints separately prove whether the browser can send the chosen
content type, whether credentials are attached, whether the server parses it,
and whether the intended state transition occurs.

## Evidence lifecycle
signal -> policy-observed -> cross-site-request-demonstrated ->
state-change-reproduced -> impact-proven -> finding

Preserve identity context, provenance, negative results, and exact state change.

## Routing
- csrf-sec: orchestration.
- hunt-csrf: modern bug-bounty variants when signals match.
- cors-sec: CORS is the primary enabling boundary.
- auth-sec: authentication/session/account binding is primary.
- clickjacking: framing is the delivery or bypass mechanism.
- xss-cross-site-scripting: XSS is the concrete prerequisite.

Avoid duplicate testing after equivalent evidence already exists.

## Bounds
Canonical key: target + endpoint + method + identity-context + csrf-control +
delivery-mode. Prefer one primary path and bounded variants. Stop on reproduced
impact, clear non-exploitability, or diminishing evidence value.

## Safety
Authorized targets only. Use test identities, synthetic data and reversible
changes; never rely on unrelated users' data or destructive actions.
