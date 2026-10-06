---
name: waf-bypass
description: >-
  WAF bypass routing and adaptive selection layer for authorized web security testing.
  Routes WAF-related failures to the appropriate registered technique without
  duplicating vulnerability-specific skills.
category: input-validation
version: "1.0.0"
author: CyberStrike
tags: [waf, bypass, filtering, intermediary, normalization, encoding, parser-differential, adaptive-testing]
tech_stack: [http, web]
cwe_ids: []
chains_with: [waf-evasion, adaptive-failure-analysis, transformation-analysis, adaptive-technique-matcher]
prerequisites: []
severity_boost: {}
---

# WAF Bypass

## High-Level Description

This is the routing skill for WAF and intermediary bypass testing.

It does not own every bypass technique. It determines which registered skill should
handle the observed condition and prevents duplicate testing across vulnerability,
WAF, and access-control skills.

## Routing Rules

| Observation | Route |
|---|---|
| Baseline payload blocked or transformed | `waf-evasion` |
| 401/403 on protected route | `401-403-bypass` |
| Encoding/normalization/parser differential | `waf-evasion` + matching technique |
| WAF/filter-specific generic behavior | `waf-bypass-techniques` |
| XSS-specific WAF handling | XSS WAF-bypass skill |
| Request smuggling / H2 differential | Dedicated HTTP skill |
| Origin exposure / CDN bypass | Origin-discovery/recon skill |
| Host routing manipulation | Host-header skill |

## Required Gates

- Target is authorized and in scope.
- Baseline request/response are preserved.
- WAF is not assumed solely from a 403, error, or payload failure.
- Existing registered techniques are preferred over invented mutations.
- Adaptive mutation limits remain enforced.

## Deduplication

Track originating vulnerability, source skill, technique identifier, request fingerprint, response fingerprint, transformation, and outcome. Equivalent techniques must not be executed twice merely because multiple routers selected them.

## Related Skills

- `waf-evasion`
- `401-403-bypass`
- `waf-bypass-techniques`
- `adaptive-technique-matcher`
- `adaptive-mutation-policy`
- `adaptive-response-differential`

## Checklist

- [ ] Authorization and scope confirmed.
- [ ] Correct WAF-related route selected.
- [ ] Existing technique reused where possible.
- [ ] Duplicate execution prevented.
- [ ] Baseline preserved.
- [ ] WAF not inferred without evidence.
- [ ] Mutation budget enforced.
- [ ] Final vulnerability validation remains with the owning skill.