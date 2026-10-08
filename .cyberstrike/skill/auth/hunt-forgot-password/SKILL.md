---
name: hunt-forgot-password
description: "Hunt Forgot Password / Account Recovery Authentication Flaws — 5 distinct patterns: (1) username enumeration via different responses for valid vs invalid email, (2) reset token exposed directly in the API response body, (3) reset token not invalidated after use (replay), (4) password reset link works from a different IP/browser (no binding), (5) no rate limit on the reset request endpoint. These are the standalone recovery-flow broken-auth primitives — distinct from reset-email host-header poisoning (hunt-host-header) and the full ATO chain (hunt-ato owns password-reset as an ATO path; prove the primitive here, chain it there). Detection: trace the full forgot-password flow from request to token to use; check response diffs between valid/invalid emails; test token replay after consumption. Medium to High (enumeration=Medium, token-reuse=High, account-takeover=Critical when chained to known-email)."
tags: [bug-bounty, security-testing, hunt, forgot, password]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: web-testing
---

# hunt-forgot-password

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt Forgot Password / Account Recovery Authentication Flaws — 5 distinct patterns: (1) username enumeration via different responses for valid vs invalid email, (2) reset token exposed directly in the API response body, (3) reset token not invalidated after use (replay), (4) password reset link works from a different IP/browser (no binding), (5) no rate limit on the reset request endpoint. These are the standalone recovery-flow broken-auth primitives — distinct from reset-email host-header poisoning (hunt-host-header) and the full ATO chain (hunt-ato owns password-reset as an ATO path; prove the primitive here, chain it there). Detection: trace the full forgot-password flow from request to token to use; check response diffs between valid/invalid emails; test token replay after consumption. Medium to High (enumeration=Medium, token-reuse=High, account-takeover=Critical when chained to known-email).

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
