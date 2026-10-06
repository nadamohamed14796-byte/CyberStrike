---
name: hunt-brute-force
description: Hunt Missing/Weak Rate Limiting — login brute force, OTP/2FA brute force (10^6 keyspace), password-reset-token brute, credential stuffing, username/email enumeration via error-string / status-code / timing differences, weak password policy, missing CAPTCHA (CAPTCHA token replay / single-use / concurrency-window bypass specifics → hunt-captcha-bypass), IP-based rate-limit bypass via X-Forwarded-For and friends, ReDoS. Distinguishes hard lockout vs soft IP-throttle vs CAPTCHA-injection vs silent shadow-throttling (avoids false-negative 'no rate limit' conclusions). Medium to Critical depending on what the brute reaches (OTP→ATO = Critical).
tags: [bug-bounty, security-testing, hunt, brute, force]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: input-validation
---

# hunt-brute-force

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt Missing/Weak Rate Limiting — login brute force, OTP/2FA brute force (10^6 keyspace), password-reset-token brute, credential stuffing, username/email enumeration via error-string / status-code / timing differences, weak password policy, missing CAPTCHA (CAPTCHA token replay / single-use / concurrency-window bypass specifics → hunt-captcha-bypass), IP-based rate-limit bypass via X-Forwarded-For and friends, ReDoS. Distinguishes hard lockout vs soft IP-throttle vs CAPTCHA-injection vs silent shadow-throttling (avoids false-negative 'no rate limit' conclusions). Medium to Critical depending on what the brute reaches (OTP→ATO = Critical).

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
