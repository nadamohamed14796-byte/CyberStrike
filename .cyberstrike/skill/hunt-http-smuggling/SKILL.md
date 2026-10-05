---
name: hunt-http-smuggling
description: Hunt HTTP request smuggling (CL.TE, TE.CL, H2.CL, H2.TE). Cause: front-end proxy and back-end server disagree on where one request ends and the next begins (Content-Length vs Transfer-Encoding header parsing inconsistency). CL.TE: front-end uses CL, back uses TE → smuggle by sending TE: chunked but with body that fits CL count. TE.CL: opposite. H2.CL: HTTP/2 downgrade, smuggle CL into HTTP/1.1 back-end. Detection tools: Burp HTTP Request Smuggler extension, smuggler.py, h2csmuggler. Confirm: time-delay technique (smuggled GET with 30s timeout) — if front-end returns slow on next victim request, smuggling works. Validate: cache poisoning chain (smuggle request that gets cached for victim), credential theft (smuggle X-Forwarded-For override that captures next user's cookies), bypass auth (smuggled internal-path request). Real paid examples from major CDN deployments. Use when hunting H1 paid programs running CDN+origin stacks, when targeting load balancer / WAF bypass.
tags: [bug-bounty, security-testing, hunt, http, smuggling]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: input-validation
---

# hunt-http-smuggling

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt HTTP request smuggling (CL.TE, TE.CL, H2.CL, H2.TE). Cause: front-end proxy and back-end server disagree on where one request ends and the next begins (Content-Length vs Transfer-Encoding header parsing inconsistency). CL.TE: front-end uses CL, back uses TE → smuggle by sending TE: chunked but with body that fits CL count. TE.CL: opposite. H2.CL: HTTP/2 downgrade, smuggle CL into HTTP/1.1 back-end. Detection tools: Burp HTTP Request Smuggler extension, smuggler.py, h2csmuggler. Confirm: time-delay technique (smuggled GET with 30s timeout) — if front-end returns slow on next victim request, smuggling works. Validate: cache poisoning chain (smuggle request that gets cached for victim), credential theft (smuggle X-Forwarded-For override that captures next user's cookies), bypass auth (smuggled internal-path request). Real paid examples from major CDN deployments. Use when hunting H1 paid programs running CDN+origin stacks, when targeting load balancer / WAF bypass.

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
