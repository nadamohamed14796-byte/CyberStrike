---
name: m365-entra-attack
description: Microsoft 365 / Entra ID red-team attack chain — current 2026 reality. AADSTS code reference, user enumeration vectors (with hardening status), Smart Lockout math, Conditional Access bypass options, ROPC + SAML SSO browser flow, Burp/Playwright templates. Built from authorized red-team work where ROPC spray surfaced pre-existing lockouts and CA-blocked credentials, plus real-time external attacker activity correlation. Use for any M365/Entra credential attack, password spray, user enumeration, CA-bypass exploration, or active-attacker-detection scenario.
tags: [bug-bounty, security-testing, m365, entra, attack]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: authentication
---

# m365-entra-attack

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Microsoft 365 / Entra ID red-team attack chain — current 2026 reality. AADSTS code reference, user enumeration vectors (with hardening status), Smart Lockout math, Conditional Access bypass options, ROPC + SAML SSO browser flow, Burp/Playwright templates. Built from authorized red-team work where ROPC spray surfaced pre-existing lockouts and CA-blocked credentials, plus real-time external attacker activity correlation. Use for any M365/Entra credential attack, password spray, user enumeration, CA-bypass exploration, or active-attacker-detection scenario.

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
