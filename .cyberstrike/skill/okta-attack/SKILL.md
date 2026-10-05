---
name: okta-attack
description: Okta-as-IdP red-team attack chain — tenant discovery, user enumeration (multiple vectors), authentication flow analysis (factors enumeration, push-notification fatigue, SMS bypass), password spray with lockout discipline, Okta-specific phishing primitives (kits, FastPass abuse, OIDC redirect_uri tampering), MFA enumeration, post-compromise admin API surface. Many enterprise orgs use Okta instead of (or alongside) Entra ID. Distinct endpoints, distinct rate-limiting, distinct factor flows. Use when recon shows `<tenant>.okta.com`, `<tenant>.okta-emea.com`, `<tenant>.oktapreview.com`, or autodiscover-style records pointing at Okta IdP.
tags: [bug-bounty, security-testing, okta, attack]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: authentication
---

# okta-attack

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Okta-as-IdP red-team attack chain — tenant discovery, user enumeration (multiple vectors), authentication flow analysis (factors enumeration, push-notification fatigue, SMS bypass), password spray with lockout discipline, Okta-specific phishing primitives (kits, FastPass abuse, OIDC redirect_uri tampering), MFA enumeration, post-compromise admin API surface. Many enterprise orgs use Okta instead of (or alongside) Entra ID. Distinct endpoints, distinct rate-limiting, distinct factor flows. Use when recon shows `<tenant>.okta.com`, `<tenant>.okta-emea.com`, `<tenant>.oktapreview.com`, or autodiscover-style records pointing at Okta IdP.

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
