---
name: evidence-hygiene
description: Evidence-capture and PoC-redaction discipline for bug-bounty submissions: cookie redaction protocol (which fields to mask, Preview annotation / Burp panel hiding / DevTools workflow), PII black-bar discipline (what to mask in other-user data — names, emails, phones, faces — vs what is safe to leave — usernames, trace IDs, request bodies), HAR file sanitization (jq filters for Cookie/Set-Cookie/Authorization headers), Burp Repeater/Intruder screenshot hygiene (hide request body, show only Results table for rate-limit attacks), Chrome DevTools Console PoC patterns (credentials include so cookies are not echoed, labeled console.log), screenshot capture order, filename conventions, post-submission rotation hygiene. Use BEFORE any PoC screenshot, BEFORE attaching a HAR, or whenever preparing evidence with session cookies or other-user PII. Pairs with bugcrowd-reporting and report-writing.
tags: [bug-bounty, security-testing, evidence, hygiene]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: reporting
---

# evidence-hygiene

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Evidence-capture and PoC-redaction discipline for bug-bounty submissions: cookie redaction protocol (which fields to mask, Preview annotation / Burp panel hiding / DevTools workflow), PII black-bar discipline (what to mask in other-user data — names, emails, phones, faces — vs what is safe to leave — usernames, trace IDs, request bodies), HAR file sanitization (jq filters for Cookie/Set-Cookie/Authorization headers), Burp Repeater/Intruder screenshot hygiene (hide request body, show only Results table for rate-limit attacks), Chrome DevTools Console PoC patterns (credentials include so cookies are not echoed, labeled console.log), screenshot capture order, filename conventions, post-submission rotation hygiene. Use BEFORE any PoC screenshot, BEFORE attaching a HAR, or whenever preparing evidence with session cookies or other-user PII. Pairs with bugcrowd-reporting and report-writing.

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
