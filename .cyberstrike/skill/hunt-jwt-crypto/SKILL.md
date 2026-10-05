---
name: hunt-jwt-crypto
description: Hunt JWT cryptographic failures — alg:none signature-stripping and RS256→HS256 key-confusion that let an attacker forge a token for any identity (e.g. an admin) without knowing a secret. Use when the app authenticates with a JSON Web Token (an `eyJ...` Bearer token in the Authorization header, a cookie, or a login response). This skill OWNS JWT signature/crypto forgery (alg:none, key confusion, kid/jku header injection); hunt-ato covers JWT as one ATO path, hunt-auth-bypass covers SSO/SAML token trust, hunt-api-misconfig covers non-crypto JWT handling. Critical when a forged token grants access to another user's data or an admin-only endpoint.
tags: [bug-bounty, security-testing, jwt, crypto, auth]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: authentication
---

# hunt-jwt-crypto

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt JWT cryptographic failures — alg:none signature-stripping and RS256→HS256 key-confusion that let an attacker forge a token for any identity (e.g. an admin) without knowing a secret. Use when the app authenticates with a JSON Web Token (an `eyJ...` Bearer token in the Authorization header, a cookie, or a login response). This skill OWNS JWT signature/crypto forgery (alg:none, key confusion, kid/jku header injection); hunt-ato covers JWT as one ATO path, hunt-auth-bypass covers SSO/SAML token trust, hunt-api-misconfig covers non-crypto JWT handling. Critical when a forged token grants access to another user's data or an admin-only endpoint.

## Workflow
1. Confirm authorization and scope.
2. Identify the concrete JWT trust-boundary signal.
3. Form a testable hypothesis from observed token handling.
4. Validate with the least-invasive reproducible test.
5. Correlate issuer, audience, signing configuration, key selection, and application authorization behavior.
6. Preserve evidence and route confirmed impact to validation/reporting.

## False-Positive Gate
A decoded token, weak-looking configuration, or algorithm string alone is not a finding. Require reproducible authorization impact.

## Safety
Use only authorized targets and test accounts. Avoid destructive or third-party credential use.

## Provenance
Adapted from elementalsouls/Claude-BugHunter under CC BY 4.0. Source: https://github.com/elementalsouls/Claude-BugHunter
