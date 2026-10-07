---
name: supply-chain-sec
description: Signal-driven supply-chain security orchestration.
category: security-orchestration
verified: official
tags: [supply-chain, signal-driven, evidence]
chains_with:
  - ci-assessment
  - cicd-attacks
  - dependency-confusion
  - hunt-cicd
  - offensive-cicd-pipeline
  - offensive-cicd-secrets
  - offensive-dependency-confusion
  - offensive-supply-chain
  - supply-chain-attack-recon
files: [SKILL.md]
---

# supply-chain Security Router

Activate only on concrete supply-chain artifact, pipeline, dependency, or data-flow evidence. Generic topic words and scanner labels are insufficient.

## Evidence lifecycle
signal -> context-confirmed -> artifact-observed -> controlled-reproduction -> impact-proven -> finding

Record target, component, version, provenance, scope, baseline, test result, impact, and negative results. Deduplicate by target + component + specialist + trigger + context.

## Safety
Use authorized repositories, test pipelines, labs, owned systems, or explicitly scoped assessments. Prefer isolated and reversible validation.
