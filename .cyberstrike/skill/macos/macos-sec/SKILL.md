---
name: macos-sec
description: Signal-driven macOS security orchestration and evidence routing.
category: security-orchestration
verified: official
tags: [macos, signal-driven, evidence, routing]
chains_with:
  - macos-postexploit
  - macos-process-injection
  - macos-security-bypass
files: [SKILL.md]
---

# macOS Security Router

Activate only from concrete macOS behavior, process, security-boundary, or post-exploitation evidence. Generic macOS presence is not sufficient.

## Routing
- macos-postexploit
- macos-process-injection
- macos-security-bypass

## Evidence gate
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record host, OS/build, process/context, authorization, provenance, baseline, controlled test, result, impact, and negative results. Deduplicate by target + component + technique + context.

## Safety
Use authorized labs, owned systems, or explicitly scoped engagements; prefer reversible, minimal-impact validation.
