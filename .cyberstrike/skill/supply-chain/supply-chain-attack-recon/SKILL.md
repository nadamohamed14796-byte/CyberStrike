---
name: supply-chain-attack-recon
description: External recon for software supply-chain attack surface — package-namespace squatting candidates, dependency-confusion vulnerabilities, GitHub Actions injection openings, container image registry exposure, SBOM mining, internal-package-name leakage, and CI/CD configuration exposure. Reconnaissance and identification ONLY — actual package publishing / typosquat attacks are EXTERNAL-OFFENSIVE and require explicit written sign-off because they can affect the entire npm/PyPI ecosystem. Use when the target has a public GitHub org, when their build artifacts/SBOMs are reachable, when their docker images are on Docker Hub/GHCR, or when you find internal package names in their JS bundles.
tags: [bug-bounty, security-testing, supply, chain, attack, recon]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: reconnaissance
---

# supply-chain-attack-recon

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
External recon for software supply-chain attack surface — package-namespace squatting candidates, dependency-confusion vulnerabilities, GitHub Actions injection openings, container image registry exposure, SBOM mining, internal-package-name leakage, and CI/CD configuration exposure. Reconnaissance and identification ONLY — actual package publishing / typosquat attacks are EXTERNAL-OFFENSIVE and require explicit written sign-off because they can affect the entire npm/PyPI ecosystem. Use when the target has a public GitHub org, when their build artifacts/SBOMs are reachable, when their docker images are on Docker Hub/GHCR, or when you find internal package names in their JS bundles.

## Workflow
1. Confirm authorization and scope before testing.
2. Identify the concrete signal that triggered this capability.
3. Form a testable hypothesis from observed behavior, code, traffic, or technology fingerprints.
4. Validate with the least-invasive reproducible test needed to establish the security boundary failure.
5. Correlate related requests, responses, client code, identity state, and infrastructure when the issue crosses layers.
6. Preserve reproducible evidence and route confirmed chains to the relevant validation/reporting skill.

## False-Positive Gate
A scanner alert, reflection, exposed endpoint, version string, or suspicious code pattern is not sufficient by itself. Require a reproducible behavior and demonstrated security impact before treating the result as a finding.

## Routing
Load this skill when its signal is stronger than generic scanning. Combine with another skill only when there is a concrete chain or shared data flow. Record useful negative results and confirmed observations in the learning layer.

## Safety
Use only on authorized targets. Prefer test accounts and synthetic data; avoid destructive actions, unnecessary access to third-party data, credential abuse, persistence, or disruption.

## Provenance
Adapted from **elementalsouls/Claude-BugHunter** under **CC BY 4.0**. This is an adapted CyberStrike skill, not a verbatim copy.
Source: https://github.com/elementalsouls/Claude-BugHunter
