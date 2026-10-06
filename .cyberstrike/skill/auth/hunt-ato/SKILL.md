---
name: hunt-ato
description: Hunt account takeover taxonomy — 9 distinct paths to ATO, plus chains. Paths: (1) password reset flaws (host-header injection redirects token, predictable/numeric token, Referer leak, no-expiry/reuse), (2) email change without re-auth, (3) OAuth account-link CSRF, (4) MFA bypass (per hunt-mfa-bypass), (5) session fixation, (6) JWT manipulation (forge token to another identity; crypto details → hunt-jwt-crypto), (7) password change without step-up (chain with login timing/length oracle), (8) social-recovery / security-question brute-force, (9) SSO subdomain takeover at OAuth redirect_uri. Chains: cookie theft + password oracle + no step-up = persistent ATO; lax redirect_uri = auth-code theft; dangling-CNAME takeover at redirect_uri = ATO. Validate: demonstrate real takeover of test account B from attacker A's session; OOB/Collaborator confirm blind token-leak steps. Use when hunting ATO chains, testing password reset / email change / MFA / OAuth / session / JWT, or chaining primitives toward Critical.
tags: [bug-bounty, security-testing, hunt, ato]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: authentication
---

# hunt-ato

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt account takeover taxonomy — 9 distinct paths to ATO, plus chains. Paths: (1) password reset flaws (host-header injection redirects token, predictable/numeric token, Referer leak, no-expiry/reuse), (2) email change without re-auth, (3) OAuth account-link CSRF, (4) MFA bypass (per hunt-mfa-bypass), (5) session fixation, (6) JWT manipulation (forge token to another identity; crypto details → hunt-jwt-crypto), (7) password change without step-up (chain with login timing/length oracle), (8) social-recovery / security-question brute-force, (9) SSO subdomain takeover at OAuth redirect_uri. Chains: cookie theft + password oracle + no step-up = persistent ATO; lax redirect_uri = auth-code theft; dangling-CNAME takeover at redirect_uri = ATO. Validate: demonstrate real takeover of test account B from attacker A's session; OOB/Collaborator confirm blind token-leak steps. Use when hunting ATO chains, testing password reset / email change / MFA / OAuth / session / JWT, or chaining primitives toward Critical.

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
