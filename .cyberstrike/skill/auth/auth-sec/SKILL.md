---
name: auth-sec
description: >-
  Entry P1 category router for authentication and authorization. Use when
  testing login flows, sessions, object authorization, JWT, OAuth, CORS, CSRF,
  and enterprise SSO weaknesses before any deeper auth topic skill.
---

# Authentication and Authorization Router

This is the routing entry point for authentication, sessions, and authorization boundaries.

Use it to decide whether the issue is mainly login mechanics, object-level authorization, browser trust boundaries, or identity protocols such as OAuth/JWT/SAML before going deeper.

## When to Use

- The target includes login, registration, password reset, 2FA, sessions, JWT, OAuth, or SSO
- You suspect object authorization flaws, cross-tenant access, cross-origin reads, CSRF, or protocol misconfiguration
- You need to decide whether to test authentication or authorization first

## Skill Map

- [Authentication Bypass](../authbypass-authentication-flaws/SKILL.md): login bypass, password reset, 2FA, enumeration, brute-force protections
- [IDOR Broken Object Authorization](../idor-broken-object-authorization/SKILL.md): IDOR, BOLA, BFLA, missing object permissions
- [JWT OAuth Token Attacks](../jwt-oauth-token-attacks/SKILL.md): algorithm confusion, key trust issues, claim abuse, token forgery
- [OAuth OIDC Misconfiguration](../oauth-oidc-misconfiguration/SKILL.md): redirect URI, state, nonce, PKCE, account binding
- [CSRF Cross Site Request Forgery](../csrf-cross-site-request-forgery/SKILL.md): CSRF tokens, SameSite, JSON CSRF, login CSRF
- [CORS Cross Origin Misconfiguration](../cors-cross-origin-misconfiguration/SKILL.md): reflected Origin, credentialed cross-origin reads, allowlist bypass
- [SAML SSO Assertion Attacks](../saml-sso-assertion-attacks/SKILL.md): assertion wrapping, signature validation, audience, ACS boundaries

## Recommended Flow

1. First confirm the authentication model and session boundaries
2. Then confirm object-level and function-level authorization
3. Then move to token, cross-origin, and protocol details
4. If enterprise federation exists, continue with OAuth, OIDC, or SAML topics

## Related Categories

- [api-sec](../api-sec/SKILL.md)
- Default credentials, username variants, wordlist sizing, and port focus are consolidated in [authbypass-authentication-flaws](../authbypass-authentication-flaws/SKILL.md)

---

Source: https://github.com/yaklang/hack-skills
License: MIT (Copyright (c) 2026 VillanCh)
Adapted for CyberStrike skill runtime. Imported as SKILL.md only; supplementary upstream files are not included.


## Extended Signal-Driven Authentication Orchestration

`auth-sec` is the single authentication/authorization entry router. Do not activate every auth-related skill merely because words such as login, token, or user appear. A specialist must have a concrete signal.

### Signal Gate

| Signal | Score | Route |
|---|---:|---|
| Login/session request or response observed | 5 | authentication + session analysis |
| Set-Cookie, session cookie, refresh token, or session state | 5 | hunt-session / WSTG session skills |
| JWT/Bearer token observed | 5 | hunt-jwt-crypto + token/session analysis |
| OAuth/OIDC authorization or token flow | 5 | hunt-oauth |
| SAML/SSO assertion or ACS endpoint | 5 | hunt-saml |
| MFA/2FA challenge or recovery factor | 5 | hunt-mfa-bypass |
| Cross-origin credentialed request / CORS headers | 5 | hunt-cors |
| State-changing cross-site request with browser credentials | 5 | hunt-csrf |
| Object identifier changes across identities | 5 | authorization/BOLA path + API router when API evidence exists |
| Role/tenant/function boundary | 5 | authorization / privilege-escalation path |
| Password reset/recovery flow | 5 | authbypass-authentication-flaws + recovery-specific hunt |
| Generic page contains the word auth or login | 0 | do not activate by itself |

### Routing Rules

Use the narrowest authoritative specialist first:

- Login, registration, password reset, recovery, authentication bypass → `authbypass-authentication-flaws`
- MFA/2FA state transition or factor downgrade → `hunt-mfa-bypass`
- JWT cryptographic/signature/key trust issue → `hunt-jwt-crypto`
- OAuth/OIDC flow → `hunt-oauth`
- SAML/enterprise SSO → `hunt-saml`
- Session lifecycle, fixation, invalidation, refresh-token reuse, cookie attributes → `hunt-session`
- CORS → `hunt-cors`
- CSRF → `hunt-csrf`
- Authorization/IDOR/BOLA/privilege boundary → existing authorization/WSTG specialist
- API-specific authentication/authorization behavior → hand off to `api-sec`; do not run a parallel generic API branch
- Business-flow abuse that requires an authenticated API transaction → `api-sec` may route to `offensive-api-abuse` / business-logic specialists
- Mobile traffic with an authenticated backend API → preserve mobile workflow, then hand the observed API surface to `api-sec`

### Anti-Duplicate Policy

`auth-sec` is a router, not a mega-skill.

Do not launch multiple specialists for the same signal unless they answer different questions. JWT crypto issues belong to `hunt-jwt-crypto`; session lifecycle issues belong to `hunt-session`; API BOLA belongs to `api-sec`; CORS on an API can use `hunt-cors` for browser validation while `api-sec` owns API context.

### Identity Context Contract

Every handoff should preserve: scope/target, endpoint, method/protocol, attacker identity/session, victim/second identity when required, role/tenant context, authentication state before/after, request/response artifacts, triggering signal, prior specialist actions, unanswered security question, and expected validation evidence.

Never treat a token appearing in a response, a missing header, a different status code, or a decoded JWT claim as a finding by itself. Require demonstrated security impact.

### Validation States

`signal → candidate → observed → reproduced → impact-proven → finding`

Examples: authentication bypass requires reaching protected state without the required control; authorization requires cross-identity protected access; JWT issues require accepted forged/modified identity or privilege; OAuth/SAML issues require changed account binding or trust; CSRF/CORS requires browser-context proof; session issues require two-session proof where applicable.

### Resource and Knowledge Policy

Prefer existing canonical CyberStrike skills, then OWASP WSTG/ASVS and protocol specifications, then PortSwigger Web Security Academy, then specialized external resources only when local coverage is insufficient. External material is reference-only; do not import it wholesale or treat scanner output as a finding.

### Bounded Execution

- Maintain one canonical identity/session inventory per target.
- Reuse captured authentication artifacts instead of rediscovering the same flow.
- Do not repeat the same specialist without new evidence.
- Maximum three auth-specialist handoffs from one signal unless evidence changes.
- Preserve partial artifacts after tool failure and continue only the affected branch.
- Stop when the security question is answered or validation evidence cannot be strengthened within scope/rate limits.

### Relationship With API Orchestration

`auth-sec` and `api-sec` are peer category routers with a controlled handoff:

`auth signal → auth-sec`
`API signal → api-sec`
`both identity and API signals → auth-sec → identity/session context → api-sec → API specialist`

This prevents the same endpoint from being tested independently by two broad routers while preserving authentication and API authorization coverage.

### Coverage Checklist

Before closing authentication, record `tested`, `not-applicable`, or `blocked` for: authentication bypass, password recovery, MFA/2FA, session lifecycle, cookies/session tokens, JWT, OAuth/OIDC, SAML/SSO, authorization/privilege escalation, object/function authorization, CSRF, CORS, API authentication/authorization handoff, account/tenant binding, logout/session invalidation, refresh-token rotation/reuse, and alternative authentication channels.
