---
name: rce-sec
description: Signal-driven remote execution security orchestration.
category: execution
verified: official
tags: [rce, execution, signal-driven, evidence]
chains_with:
  - arbitrary-write-to-rce
  - hunt-rce
  - offensive-rce
  - hunt-brute-force
  - hunt-source-leak
  - insecure-source-code-management
  - offensive-shellcode
  - reverse-shell-techniques
files: [SKILL.md]
---

# Remote Execution Security Router

Activate only when a concrete execution boundary is observed: controllable input
reaching an execution sink, a reproducible execution primitive, or an established
vulnerability chain with execution impact.

A scanner RCE label, generic command parameter, or theoretical exploitability is
not sufficient.

## Evidence lifecycle
signal -> execution-sink-confirmed -> controlled-execution-observed ->
reproduced -> impact-proven -> finding

Record target, endpoint/process, input/source, sink, runtime, identity, provenance,
baseline, controlled result, impact, and negative results. Deduplicate by target +
execution sink + primitive + context.

## Safety
Use only authorized labs, owned systems, or explicitly scoped assessments. Prefer
harmless proof, isolated targets, reversible validation, and no persistence.
