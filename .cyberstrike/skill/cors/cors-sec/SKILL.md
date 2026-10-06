---
name: cors-sec
description: Signal-driven CORS security orchestration for origin trust, credentialed browser reads, preflight policy, cache interaction, and cross-origin trust chains.
category: web-application
verified: official
tags: [cors, cross-origin, browser-security, access-control, signal-driven]
tech_stack: [web, http, javascript]
cwe_ids: [CWE-942, CWE-346]
version: "1.0"
chains_with: [cors-cross-origin-misconfiguration, hunt-cors, attack-cors, auth-sec, csrf-cross-site-request-forgery, api-sec, clickjacking]
files: [SKILL.md]
---

# CORS Security Router

Canonical routing layer for the existing CORS skills. It selects a specialist only when concrete browser/CORS evidence exists; it does not replace or duplicate them.

## Activation Gate

Strong signals:
- response contains Access-Control-Allow-Origin or other CORS policy headers;
- authenticated API response is potentially readable cross-origin;
- server reflects an attacker-controlled Origin;
- Access-Control-Allow-Credentials is paired with a non-static origin policy;
- suspicious allowlist matching, null-origin trust, or preflight policy is observed;
- browser testing shows a cross-origin response becomes readable;
- CORS behavior interacts with cache, subdomain, XSS, OAuth, CSRF, or API trust boundaries.

Weak/non-signals:
- the word CORS appears in page text;
- a public endpoint returns non-sensitive data;
- wildcard ACAO alone on a non-credentialed public resource;
- scanner label without browser/data-impact evidence;
- OPTIONS exists without an observable policy weakness.

## Routing

| Evidence | Route |
|---|---|
| Origin reflection / allowlist / credentialed browser-read issue | cors-cross-origin-misconfiguration |
| Hunting and validation workflow | hunt-cors |
| Existing automated/manual CORS workflow | attack-cors |
| Authentication/session consequence | auth-sec |
| State-changing cross-origin consequence | csrf-cross-site-request-forgery |
| API-specific trust boundary | api-sec |
| Cross-origin UI framing chain | clickjacking |

Do not load all CORS specialists for the same question. Start with one primary route and add another only when new evidence creates a distinct unanswered question.

## Policy Model

Normalize request Origin, ACAO, ACAC, ACAM, ACAH, preflight status, Vary/cache headers, redirect chain, credentials mode, endpoint sensitivity, and browser read result.

Classify the policy as: public, allowlisted, reflected, wildcard, null-accepted, bypassable, preflight-restricted, or unknown.

## Evidence Gate

Use: signal → policy-observed → browser-validated → sensitive-data-read → reproduced → impact-proven → finding

A reflected Origin is a candidate, not automatically a vulnerability. Missing Vary: Origin is not automatically exploitable. Severity requires the actual browser security boundary and data/action impact.

Preserve exact request/response, Origin, credentials mode, relevant CORS headers, identity/test account, data sensitivity, browser result, cache/redirect context, negative controls, and reproduction count.

## Safe Validation

Prefer a dedicated attacker/test origin and test account. Read only synthetic or authorized data. Do not exfiltrate real secrets. Do not treat server-side header reflection as proof when the browser blocks the read.

For cache cases, establish behavior with harmless synthetic responses before claiming a cross-origin cache issue.

## Correlation

- CORS + authenticated API → api-sec/auth specialist.
- CORS + state-changing action → CSRF specialist.
- trusted subdomain + XSS → XSS specialist and CORS chain.
- CORS + open redirect → existing open-redirect skill.
- CORS + framing/UI redress → clickjacking.

## Bounds and Deduplication

- Canonical key: target + endpoint + Origin policy + credential mode.
- Reuse captured traffic and browser evidence.
- One primary validation path before bypass variants.
- Maximum three specialist handoffs per signal unless new evidence changes the question.
- Stop after browser impact is reproduced or the policy is shown non-exploitable.

## Non-Duplication

Existing attack-cors, cors-cross-origin-misconfiguration, and hunt-cors remain authoritative. This router adds activation, routing, evidence, and deduplication policy only.