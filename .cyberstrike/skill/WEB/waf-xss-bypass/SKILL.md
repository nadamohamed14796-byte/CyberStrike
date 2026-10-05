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