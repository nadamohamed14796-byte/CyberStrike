---
name: redteam-mindset
description: Red-team operator discipline — the mindset corrections that separate offensive testing from defensive WAPT. Built from authorized red-team work where conservative defaults caused multiple findings to be missed and one to be incorrectly retracted. Use at the START of any red-team engagement and again whenever feeling stuck or considering 'stopping' on a defended target. The single most important skill to load when scope is 'external red team' not 'bug bounty / WAPT'.
tags: [bug-bounty, security-testing, redteam, mindset]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: reporting
---

# redteam-mindset

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Red-team operator discipline — the mindset corrections that separate offensive testing from defensive WAPT. Built from authorized red-team work where conservative defaults caused multiple findings to be missed and one to be incorrectly retracted. Use at the START of any red-team engagement and again whenever feeling stuck or considering "stopping" on a defended target. The single most important skill to load when scope is "external red team" not "bug bounty / WAPT".

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
