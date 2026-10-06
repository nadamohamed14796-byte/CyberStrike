---
name: csrf-sec
description: >-
  Signal-driven CSRF security orchestration for state-changing browser flows,
  anti-CSRF controls, SameSite cookie behavior, JSON/multipart CSRF, login CSRF,
  OAuth state binding, and CSRF chains with CORS, XSS, clickjacking, or API abuse.
category: web-application
verified: official
tags:
  - csrf
  - cross-site-request-forgery
  - browser-security
  - samesite
  - anti-csrf
  - signal-driven
tech_stack:
  - web
  - http
  - javascript
cwe_ids:
  - CWE-352
chains_with:
  - csrf-cross-site-request-forgery
  - hunt-csrf
  - cors-sec
  - auth-sec
  - api-sec
  - clickjacking
  - xss-cross-site-scripting
files:
  - SKILL.md
---

# CSRF Security Router

## Mission

Route only when there is concrete evidence of a cross-site state-changing security
boundary. Keep the existing CSRF playbooks authoritative; this skill is the
orchestration layer, not a replacement.

## Activation signals

### Strong signals
- authenticated state-changing request whose authority is primarily a browser cookie/session
- missing, inconsistent, reusable, predictable, or cross-session CSRF token evidence
- SameSite/session-cookie behavior relevant to a cross-site state change
- endpoint accepts GET, simple-form, text/plain, or multipart input for a sensitive action
- Origin/Referer validation is present and appears bypassable
- login, account-linking, OAuth callback, email/password, MFA, API-key, role,
  payment, deletion, webhook, or other security-sensitive state change
- browser proof that a cross-site request is sent with the victim's authority
- concrete interaction with CORS, XSS, clickjacking, API, or OAuth state binding

### Do not activate on
- the word “CSRF” alone
- a scanner label without a reproducible behavior
- a public read-only GET endpoint
- presence of a token without evidence that validation is defective
- SameSite=None by itself without a state-changing impact path
- OPTIONS/preflight traffic alone
- CORS headers alone; route CORS issues to `cors-sec`

## Routing

1. `csrf-cross-site-request-forgery` — comprehensive token, SameSite,
   JSON/multipart, login-CSRF, OAuth-state, clickjacking and chained testing.
2. `hunt-csrf` — modern bug-bounty patterns and chain-oriented hunting when
   the concrete signal matches its scope.
3. `cors-sec` — when cross-origin response readability or credentialed CORS
   is the enabling boundary.
4. `auth-sec` — when the primary failure is authentication/session/MFA/account
   binding rather than CSRF itself.
5. `api-sec` — when the state change is an API protocol or API authorization
   surface requiring API-specific analysis.
6. `clickjacking` — when framing enables the state change or bypass.
7. `xss-cross-site-scripting` — when script execution is the prerequisite
   that makes the CSRF chain possible.

Prefer one primary route. Add a secondary route only when the evidence shows a
shared attack chain or distinct security boundary.

## Analysis model

Normalize each candidate into:
- target + endpoint + method
- authenticated identity/session model
- state-changing action and business impact
- cookie attributes: Secure, HttpOnly, SameSite, Domain, Path
- CSRF token location, entropy/uniqueness, lifecycle, binding, validation
- Origin/Referer policy and failure behavior
- accepted content types and method overrides
- browser request mode and whether credentials are actually sent
- CORS/preflight dependency when applicable
- OAuth/login/account-link state binding when applicable
- reproducibility and evidence provenance

## Validation gates

A CSRF candidate progresses only as:

`signal → policy-observed → cross-site-request-demonstrated →
state-change-reproduced → impact-proven → finding`

Reflection, missing token, weak-looking SameSite settings, or a scanner result
alone never becomes a finding.

Use a dedicated attacker/test origin and test account where possible. Prefer
synthetic values and reversible state changes. Do not access unrelated users'
data or perform destructive actions.

For JSON CSRF, distinguish:
- browser can send the request
- server accepts the browser-sendable content type
- credentials are attached
- the intended state transition actually occurs

For CORS-assisted cases, distinguish request forgery from response readability;
do not report a CORS issue as CSRF merely because credentials are allowed.

## Evidence and handoff

Record:
- exact baseline request/response
- mutated request and cross-site delivery mechanism
- cookie/token policy before and after
- browser-observed credential behavior
- resulting state transition
- identity and scope context
- timestamps, tool/source provenance, and reproducibility
- negative results for tested defenses

Handoff only the minimum evidence needed by the next skill. Preserve the
original request/response correlation and identity context.

## Bounds and deduplication

Canonical candidate key:
`target + endpoint + method + identity-context + CSRF-control + delivery-mode`

Reuse existing evidence. Test one primary bypass path at a time, with bounded
variants for method/content-type/token/Origin/SameSite behavior. Stop when the
security boundary is reproduced, the hypothesis is disproven, or further
mutation cannot materially increase confidence.

## External references

External writeups and tooling are reference material only. Load them when the
observed signal matches the technique; do not bulk-import payloads or activate
generic CSRF scans merely because the router was loaded.

## Safety

Authorized targets only. Use test identities, synthetic data, reversible
state changes, and the least-invasive validation necessary.
