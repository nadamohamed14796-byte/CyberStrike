---
name: hunt-shadow-api
description: Hunt shadow / zombie / undocumented API surface (OWASP API9 Improper Inventory Management) — enumerate the full API version history (v1/v2/beta/legacy paths, header- and subdomain-based versioning), pull and diff every reachable OpenAPI/Swagger spec (including ones only findable via the Wayback Machine), and behaviorally diff old vs. current versions for auth/rate-limit/validation regressions rather than just response-shape differences. Distinct from hunt-api-misconfig, which owns exploitation once you have a spec or endpoint (mass assignment, JWT, OData, Swagger-chain attacks); distinct from hunt-subdomain, which owns host-level discovery. This skill owns the version-inventory and behavioral-diff workflow itself. Use when the target has versioned API paths, multiple specs, a changelog referencing deprecated endpoints, or a mobile app whose hardcoded backend calls look older than the current web app's.
tags: [bug-bounty, security-testing, hunt, shadow, api]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: api-testing
---

# hunt-shadow-api

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt shadow / zombie / undocumented API surface (OWASP API9 Improper Inventory Management) — enumerate the full API version history (v1/v2/beta/legacy paths, header- and subdomain-based versioning), pull and diff every reachable OpenAPI/Swagger spec (including ones only findable via the Wayback Machine), and behaviorally diff old vs. current versions for auth/rate-limit/validation regressions rather than just response-shape differences. Distinct from hunt-api-misconfig, which owns exploitation once you have a spec or endpoint (mass assignment, JWT, OData, Swagger-chain attacks); distinct from hunt-subdomain, which owns host-level discovery. This skill owns the version-inventory and behavioral-diff workflow itself. Use when the target has versioned API paths, multiple specs, a changelog referencing deprecated endpoints, or a mobile app whose hardcoded backend calls look older than the current web app's.

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
