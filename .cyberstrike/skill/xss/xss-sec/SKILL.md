---
name: xss-sec
description: Signal-driven xss security orchestration.
category: web-application
verified: official
tags: [xss, signal-driven, evidence]
chains_with:
  - RECON
  - WEB
  - csp-bypass-advanced
  - dangling-markup-injection
  - hunt-dom
  - hunt-html-injection
  - hunt-xss
  - waf-bypass
  - xss-cross-site-scripting
files: [SKILL.md]
---

# xss Security Router

Activate only on concrete xss data-flow, parser, browser, or application behavior. Generic topic words and scanner labels are insufficient.

## Routing
- RECON
- WEB
- csp-bypass-advanced
- dangling-markup-injection
- hunt-dom
- hunt-html-injection
- hunt-xss
- waf-bypass
- xss-cross-site-scripting

## Evidence lifecycle
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, context, input/source, sink/parser, provenance, baseline, controlled test, result, impact, and negative results. Deduplicate by target + endpoint/component + context + specialist.

## Safety
Use authorized applications and controlled test data. Prefer harmless markers, reversible tests, and minimal-impact validation.
