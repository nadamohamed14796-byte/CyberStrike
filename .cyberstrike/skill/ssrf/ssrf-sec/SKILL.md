---
name: ssrf-sec
description: Signal-driven server-side request security orchestration.
category: web-application
verified: official
tags: [ssrf, outbound-request, signal-driven, evidence]
chains_with:
  - attack-ssrf
  - hunt-ssrf
  - offensive-ssrf
  - ssrf-server-side-request-forgery
files: [SKILL.md]
---

# Server-Side Request Security Router

Activate only when observed application-controlled outbound requests, URL fetchers,
webhooks, importers, image/document fetchers, or equivalent server-side network
boundaries are present.

## Evidence lifecycle
signal -> outbound-boundary-confirmed -> controlled-observation -> impact-proven -> finding

Record destination class, parser/normalization behavior, identity, provenance,
baseline, controlled test, response/OOB evidence, and negative results.

## Safety
Use only authorized targets and controlled destinations. Never access unrelated
internal services or sensitive metadata; use unique test infrastructure.
