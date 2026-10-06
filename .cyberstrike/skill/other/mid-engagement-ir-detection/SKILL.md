---
name: mid-engagement-ir-detection
description: Methodology for detecting client SOC patches, attacker activity, and security-state changes that occur DURING a red-team engagement — and converting those observations into deliverable findings. Built from authorized red-team work where the client patched a confirmed SQLi within 30 minutes of detection AND an external attacker locked multiple new accounts during a single test session. Use when (a) running ANY active engagement against a monitored target, (b) a previously-confirmed finding stops reproducing, (c) baseline timing shifts unexpectedly, or (d) you notice response patterns changing during testing.
tags: [bug-bounty, security-testing, mid, engagement, detection]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: web-testing
---

# mid-engagement-ir-detection

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Methodology for detecting client SOC patches, attacker activity, and security-state changes that occur DURING a red-team engagement — and converting those observations into deliverable findings. Built from authorized red-team work where the client patched a confirmed SQLi within 30 minutes of detection AND an external attacker locked multiple new accounts during a single test session. Use when (a) running ANY active engagement against a monitored target, (b) a previously-confirmed finding stops reproducing, (c) baseline timing shifts unexpectedly, or (d) you notice response patterns changing during testing.

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
