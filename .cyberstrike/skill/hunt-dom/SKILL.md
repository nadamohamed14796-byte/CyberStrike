---
name: hunt-dom
description: Hunt client-side DOM vulnerabilities — DOM Clobbering (overwrite JS globals via HTML injection), PostMessage hijacking (missing origin check), Service Worker abuse (intercept requests from same-origin script), CSS Injection/Exfiltration (attribute selectors → token char-by-char via OOB), client-side template injection, dangerouslySetInnerHTML. Grounded in named public research: Gareth Heyes / PortSwigger DOM-clobbering + DOM-Invader, Michał Bentkowski DOMPurify clobbering bypasses, jQuery htmlPrefilter XSS (CVE-2020-11022 / CVE-2020-11023), d0nut CSS-exfil research. Use when hunting DOM-XSS, client-side auth bypass, or token exfiltration without server-side interaction.
tags: [bug-bounty, security-testing, hunt, dom]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: web-testing
---

# hunt-dom

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt client-side DOM vulnerabilities — DOM Clobbering (overwrite JS globals via HTML injection), PostMessage hijacking (missing origin check), Service Worker abuse (intercept requests from same-origin script), CSS Injection/Exfiltration (attribute selectors → token char-by-char via OOB), client-side template injection, dangerouslySetInnerHTML. Grounded in named public research: Gareth Heyes / PortSwigger DOM-clobbering + DOM-Invader, Michał Bentkowski DOMPurify clobbering bypasses, jQuery htmlPrefilter XSS (CVE-2020-11022 / CVE-2020-11023), d0nut CSS-exfil research. Use when hunting DOM-XSS, client-side auth bypass, or token exfiltration without server-side interaction.

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
