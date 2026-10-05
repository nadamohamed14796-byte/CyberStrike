---
name: recon-scope-triage
description: Triage ASM/recon output for ownership before testing — separate the target's real assets from namespace-collision noise. Automated recon keyword-matches on the brand name, so for any target whose name is a common/dictionary word, the output is dominated by assets belonging to UNRELATED same-named companies (repos, cloud buckets, mobile apps, breach corpora, typosquats). Built from an authorized engagement where an ASM report's 'Criticals' were overwhelmingly false positives and the combo/repos/mobile/bucket lists were polluted with unrelated same-named orgs. Use at the START of any engagement, immediately on receiving any ASM/recon/OSINT dataset, BEFORE testing anything.
tags: [bug-bounty, security-testing, recon, scope, triage]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: reconnaissance
---

# recon-scope-triage

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Triage ASM/recon output for ownership before testing — separate the target's real assets from namespace-collision noise. Automated recon keyword-matches on the brand name, so for any target whose name is a common/dictionary word, the output is dominated by assets belonging to UNRELATED same-named companies (repos, cloud buckets, mobile apps, breach corpora, typosquats). Built from an authorized engagement where an ASM report's "Criticals" were overwhelmingly false positives and the combo/repos/mobile/bucket lists were polluted with unrelated same-named orgs. Use at the START of any engagement, immediately on receiving any ASM/recon/OSINT dataset, BEFORE testing anything.

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
