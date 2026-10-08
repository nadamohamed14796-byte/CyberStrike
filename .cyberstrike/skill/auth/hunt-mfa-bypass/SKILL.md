---
name: hunt-mfa-bypass
description: "Hunt MFA / 2FA bypass — 7 distinct patterns. (1) MFA not enforced on sensitive endpoints (password change, email change accept without MFA challenge), (2) MFA-step skip via direct navigation to post-login URL, (3) MFA-token replay (same code accepted twice), (4) brute-force the 6-digit OTP without rate limit (10^6 attempts at server speed), (5) race condition on OTP validation, (6) recovery-code dump via /api/me, (7) backup factor downgrade (SMS factor with no rate limit). Plus the chain: cookie theft + password oracle + no step-up = ATO without MFA challenge. Detection: trace auth flow in Burp, find every state transition, check if MFA is middleware-gated vs per-endpoint, check OTP entropy and rate limit on OTP-validate. Validate: attacker session reaching post-MFA state. Use when hunting auth bypass, MFA flows, chaining primitives toward ATO."
tags: [bug-bounty, security-testing, hunt, mfa, bypass]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: authentication
---

# hunt-mfa-bypass

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt MFA / 2FA bypass — 7 distinct patterns. (1) MFA not enforced on sensitive endpoints (password change, email change accept without MFA challenge), (2) MFA-step skip via direct navigation to post-login URL, (3) MFA-token replay (same code accepted twice), (4) brute-force the 6-digit OTP without rate limit (10^6 attempts at server speed), (5) race condition on OTP validation, (6) recovery-code dump via /api/me, (7) backup factor downgrade (SMS factor with no rate limit). Plus the chain: cookie theft + password oracle + no step-up = ATO without MFA challenge. Detection: trace auth flow in Burp, find every state transition, check if MFA is middleware-gated vs per-endpoint, check OTP entropy and rate limit on OTP-validate. Validate: attacker session reaching post-MFA state. Use when hunting auth bypass, MFA flows, chaining primitives toward ATO.

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
