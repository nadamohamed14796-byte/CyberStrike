---
name: hunt-cache-poison
description: Hunting skill for cache poison vulnerabilities. Built from 10 public bug bounty reports including X-Forwarded-Host poisoning, X-HTTP-Method-Override / GCS cache, reflected→stored XSS via cache, classic Omer-Gil Web Cache Deception, Cloudflare Cache Deception Armor bypass, session-token cache deception, Akamai hop-by-hop smuggling → server-side edge poisoning, and Kettle's 2024 path-normalization WCD against Cloudflare/Fastly/GCP. Host/X-Forwarded-Host injection that reaches app logic (reset-link poisoning, routing SSRF, OAuth issuer) is owned by hunt-host-header; this skill owns the case where the poisoned response is CACHED and served to other users. Use when hunting cache poisoning, Web Cache Deception, CDN-fronted apps.
tags: [bug-bounty, security-testing, hunt, cache, poison]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: web-testing
---

# hunt-cache-poison

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunting skill for cache poison vulnerabilities. Built from 10 public bug bounty reports including X-Forwarded-Host poisoning, X-HTTP-Method-Override / GCS cache, reflected→stored XSS via cache, classic Omer-Gil Web Cache Deception, Cloudflare Cache Deception Armor bypass, session-token cache deception, Akamai hop-by-hop smuggling → server-side edge poisoning, and Kettle's 2024 path-normalization WCD against Cloudflare/Fastly/GCP. Host/X-Forwarded-Host injection that reaches app logic (reset-link poisoning, routing SSRF, OAuth issuer) is owned by hunt-host-header; this skill owns the case where the poisoned response is CACHED and served to other users. Use when hunting cache poisoning, Web Cache Deception, CDN-fronted apps.

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
