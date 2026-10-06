---
name: waf-xss-bypass
description: >-
  XSS-specific WAF bypass analysis for authorized testing when an XSS candidate
  is blocked or transformed by a WAF.
category: client-side
version: "1.0.0"
author: CyberStrike
tags: [xss, waf, bypass, encoding, filtering, adaptive-testing]
tech_stack: [http, web, javascript]
cwe_ids: [CWE-79]
chains_with: [waf-evasion, adaptive-technique-matcher]
prerequisites: [waf-evasion]
severity_boost: {}
---

# WAF XSS Bypass Testing

Use this skill when an XSS candidate is blocked or transformed by a WAF and the target is explicitly authorized for security testing.

## Workflow
1. Confirm the parameter/context and establish a harmless baseline.
2. Fingerprint the WAF only when evidence is available; do not assume the vendor from a block page alone.
3. Select the vendor corpus that matches the observed WAF.
4. Prefer context-appropriate variants and encode only as required by the application.
5. Compare request/response behavior and browser parsing; a WAF bypass is not a vulnerability by itself.
6. Validate the underlying XSS impact in an authorized environment and preserve request/response evidence.
7. Record effective/ineffective transformations for later learning.

## Payload corpora
- payloads/akamai.txt
- payloads/cloudflare.txt
- payloads/cloudfront.txt
- payloads/imperva.txt
- payloads/incapsula.txt
- payloads/wordfence.txt

## Source
Imported from `gprime31/WAF-bypass-xss-payloads` (master) on 2026-10-05. Preserve upstream attribution. The upstream README notes that some payloads may be endpoint-specific or later fixed by vendors.

## Validation gate
A reflected string, WAF block, or payload match is not evidence of a vulnerability. Require actual execution and impact validation before reporting.
## Signal gate
Activate only when at least one concrete signal is present:
- WAF block/challenge or filtering behavior observed on an XSS candidate.
- WAF fingerprint supported by response/header/body evidence.
- Payload transformation, normalization, or context-specific filtering is observed.

Do not activate from the word "WAF" alone, from a generic 403/401, or from an unrelated XSS signal. If no WAF-specific evidence exists, hand off to the normal XSS skill instead.

## Bounded testing policy
- Start with one context-appropriate corpus and one controlled mutation at a time.
- Keep baseline/variant request lineage so every bypass claim is reproducible.
- Stop after 3 materially different mutations without new evidence; hand off to adaptive-testing when transformation or differential analysis is needed.
- Never treat a successful HTTP status, reflection, or WAF evasion alone as a finding.
- External payload collections are reference material only; validate every candidate against the observed application context.

## Compatibility
Legacy corpus copies under .cyberstrike/skill/WEB/waf-xss-bypass/payloads/ are intentionally preserved for compatibility with older workflows and references. The canonical corpus remains under this skill and both are kept intact.