---
name: hunt-captcha-bypass
description: Hunt CAPTCHA Bypass — 6 distinct patterns: (1) CAPTCHA field simply omitted from the request (server-side validation absent), (2) CAPTCHA token replayed from a solved challenge (no single-use enforcement), (3) CAPTCHA response accepted on a different endpoint than it was solved on (no binding to action/session), (4) static or predictable CAPTCHA values accepted (e.g. '0', 'null', empty string), (5) audio/accessibility CAPTCHA trivially solvable programmatically, (6) CAPTCHA only enforced after N failures (first N requests bypass it). Detection: intercept a successful form submission, remove the CAPTCHA field entirely, replay — if it still succeeds, server-side validation is absent. Medium severity standalone; High when it removes the only rate-limit gate protecting a login, registration, or payment endpoint.
tags: [bug-bounty, security-testing, hunt, captcha, bypass]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: input-validation
---

# hunt-captcha-bypass

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt CAPTCHA Bypass — 6 distinct patterns: (1) CAPTCHA field simply omitted from the request (server-side validation absent), (2) CAPTCHA token replayed from a solved challenge (no single-use enforcement), (3) CAPTCHA response accepted on a different endpoint than it was solved on (no binding to action/session), (4) static or predictable CAPTCHA values accepted (e.g. '0', 'null', empty string), (5) audio/accessibility CAPTCHA trivially solvable programmatically, (6) CAPTCHA only enforced after N failures (first N requests bypass it). Detection: intercept a successful form submission, remove the CAPTCHA field entirely, replay — if it still succeeds, server-side validation is absent. Medium severity standalone; High when it removes the only rate-limit gate protecting a login, registration, or payment endpoint.

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
