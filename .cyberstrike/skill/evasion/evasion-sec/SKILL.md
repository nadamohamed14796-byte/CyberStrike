---
name: evasion-sec
description: >-
  Signal-driven evasion orchestration for authorized security testing, reverse
  engineering, endpoint protection analysis, anti-debugging, obfuscation,
  security-control bypass analysis, and forensic-artifact analysis.
category: evasion
verified: official
tags: [evasion, anti-debugging, obfuscation, edr, av, anti-forensics, signal-driven]
tech_stack: [windows, linux, macos, native, dotnet, web]
chains_with:
  - anti-debugging-techniques
  - code-obfuscation-deobfuscation
  - linux-security-bypass
  - macos-security-bypass
  - offensive-anti-forensics
  - offensive-edr-evasion
  - windows-av-evasion
  - memory-forensics-volatility
  - waf-evasion
files: [SKILL.md]
---

# Evasion Security Router

## Mission
Coordinate evasion-related analysis without activating broad bypass playbooks from
generic words such as "evasion", "AV", "EDR", or "debugger". Existing specialist
skills remain authoritative; this router selects the smallest relevant specialist
from concrete target evidence.

## Activation signals

Strong signals:
- observed anti-debugging checks such as ptrace, debugger flags, timing/exception checks
- concrete obfuscation/packing/control-flow-flattening/string-encryption evidence
- a specific AV/EDR control blocking an authorized test artifact or behavior
- observed security-control enforcement such as AppArmor, SELinux, seccomp, TCC,
  Gatekeeper, SIP, sandbox, code-signing, or entitlement enforcement
- concrete forensic-artifact analysis or an authorized need to understand indicator
  removal/detection coverage
- web intermediary normalization/filtering evidence relevant to WAF analysis

Do not activate from:
- the word "evasion" alone
- OS/platform alone
- generic AV/EDR presence without an observed control or research question
- a scanner label without behavioral evidence
- a desire to make arbitrary malware stealthier outside an authorized engagement

## Routing
- anti-debugging-techniques: concrete debugger-detection evidence.
- code-obfuscation-deobfuscation: observed obfuscation, packing, opaque predicates,
  self-modification, or VM-protection evidence.
- windows-av-evasion: Windows AV/AMSI/ETW or endpoint-control behavior.
- offensive-edr-evasion: concrete EDR telemetry/blocking or red-team control analysis.
- linux-security-bypass: Linux shell, MAC, seccomp, noexec, or audit-control boundary.
- macos-security-bypass: TCC, Gatekeeper, SIP, sandbox, signing, or entitlement boundary.
- offensive-anti-forensics: authorized forensic-artifact analysis or indicator-removal
  testing; preserve defender visibility and engagement constraints.
- memory-forensics-volatility: memory-artifact examination is the primary task.
- waf-evasion: HTTP intermediary transformation/filter behavior; keep web scope separate
  from endpoint evasion.

Prefer one primary route. Add a secondary route only when evidence proves a distinct
control boundary or an explicit analysis dependency.

## Evidence model
Normalize:
- target/host/process/application
- operating system and runtime
- security control and observed enforcement
- triggering artifact/behavior
- baseline versus changed behavior
- instrumentation/tool provenance
- authorization and scope
- reversibility and impact

Lifecycle:
signal -> control-observed -> controlled-analysis -> behavior-reproduced ->
impact/coverage-proven -> finding or defensive observation

An evasion technique working in isolation is not automatically a vulnerability.
For a security-control finding, prove what protection was bypassed and what security
impact or coverage gap resulted.

## Bounded execution
Use the least invasive test that distinguishes the hypothesis. Start with
observation/instrumentation, then one controlled change, then a small number of
evidence-driven variants. Do not spray unrelated bypass families.

Canonical key:
target + control + technique-family + runtime + observation

Reuse prior evidence and stop when the control behavior is reproduced, the hypothesis
is disproven, or additional mutations no longer increase confidence.

## Handoffs
Pass only:
- concrete triggering signal
- baseline/control behavior
- exact artifact/process/request correlation
- environment/runtime evidence
- authorization and scope context
- current evidence state
- tested variants and negative results

Never convert a generic evasion request into a broad multi-skill activation.

## External resources
Load external research only after the concrete technique family is identified.
Treat writeups, detection matrices, and tooling references as reference material;
do not bulk-import or automatically execute external bypass recipes.

## Safety
Authorized labs, owned systems, or explicitly scoped engagements only. Prefer
isolated test artifacts, synthetic data, reversible changes, and defender-visible
validation. Do not use this router to facilitate unauthorized persistence,
credential theft, destructive anti-forensics, or covert compromise.
