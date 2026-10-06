---
name: hunt-exceptional-conditions
description: Hunt mishandling of exceptional conditions — feed an endpoint malformed/unexpected input (wrong type, broken JSON, oversized field, null byte) and make it fail OPEN or leak internals: a verbose stack-trace / framework error page that discloses ORM internals, server file paths, library versions, or a language traceback. Use on any input-accepting endpoint (JSON APIs, forms, query params). Medium-High when the leak exposes internal structure that arms a deeper attack.
tags: [bug-bounty, security-testing, hunt, exceptional, conditions]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: web-testing
---

# hunt-exceptional-conditions

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt mishandling of exceptional conditions — feed an endpoint malformed/unexpected input (wrong type, broken JSON, oversized field, null byte) and make it fail OPEN or leak internals: a verbose stack-trace / framework error page that discloses ORM internals, server file paths, library versions, or a language traceback. Use on any input-accepting endpoint (JSON APIs, forms, query params). Medium-High when the leak exposes internal structure that arms a deeper attack.

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
