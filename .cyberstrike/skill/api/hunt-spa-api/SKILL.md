---
name: hunt-spa-api
description: Discover a single-page-app's hidden backend API from its public JS bundle, then test that API for broken access control / missing authentication. One of the highest-yield web plays in modern recon — SPAs ship their entire backend route map to the browser, and the API behind them is frequently missing the auth middleware the login page implies. Built from an authorized engagement where this play found an unauthenticated financial API that an ASM scan reporting hundreds of 'Criticals' completely missed. Use whenever a target serves a JS-heavy SPA (React/Vue/Angular/Next), an 'app'/'console'/'dashboard'/'portal' subdomain, or any `*api*` host shows up in recon. Leaked build artifacts (source maps / .env / .git / asset-manifest) are owned by hunt-source-leak; API version-inventory and behavioral diffing by hunt-shadow-api; this skill owns mapping a live SPA's backend routes from its JS bundle and testing them for broken access control / missing auth.
tags: [bug-bounty, security-testing, hunt, spa, api]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: api-testing
---

# hunt-spa-api

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Discover a single-page-app's hidden backend API from its public JS bundle, then test that API for broken access control / missing authentication. One of the highest-yield web plays in modern recon — SPAs ship their entire backend route map to the browser, and the API behind them is frequently missing the auth middleware the login page implies. Built from an authorized engagement where this play found an unauthenticated financial API that an ASM scan reporting hundreds of "Criticals" completely missed. Use whenever a target serves a JS-heavy SPA (React/Vue/Angular/Next), an "app"/"console"/"dashboard"/"portal" subdomain, or any `*api*` host shows up in recon. Leaked build artifacts (source maps / .env / .git / asset-manifest) are owned by hunt-source-leak; API version-inventory and behavioral diffing by hunt-shadow-api; this skill owns mapping a live SPA's backend routes from its JS bundle and testing them for broken access control / missing auth.

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
