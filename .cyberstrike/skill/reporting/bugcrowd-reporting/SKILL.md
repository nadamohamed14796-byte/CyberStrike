---
name: bugcrowd-reporting
description: "Bugcrowd-specific reporting tactics complementing report-writing: VRT category search-and-fallback strategy when no exact match exists, manual severity override when VRT defaults underrate impact, severity-request paragraph as first body section, OOS-clause rebuttal templates (rate limiting on auth-flow endpoints, debug-info framing, user-enumeration with sensitive PII, theoretical-issue counter), chained-finding cross-reference patterns, target selection for QA-vs-prod programs, researcher-side hygiene (Bugcrowdninja email alias, account state restoration, friendly-tester posture). Use when filing a Bugcrowd submission, when VRT default seems wrong, when triager closes as OOS or downgrades severity, when chaining linked submissions, or when scope distinguishes production from QA. Pairs with report-writing and triage-validation."
tags: [bug-bounty, security-testing, bugcrowd, reporting]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: reporting
---

# bugcrowd-reporting

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Bugcrowd-specific reporting tactics complementing report-writing: VRT category search-and-fallback strategy when no exact match exists, manual severity override when VRT defaults underrate impact, severity-request paragraph as first body section, OOS-clause rebuttal templates (rate limiting on auth-flow endpoints, debug-info framing, user-enumeration with sensitive PII, theoretical-issue counter), chained-finding cross-reference patterns, target selection for QA-vs-prod programs, researcher-side hygiene (Bugcrowdninja email alias, account state restoration, friendly-tester posture). Use when filing a Bugcrowd submission, when VRT default seems wrong, when triager closes as OOS or downgrades severity, when chaining linked submissions, or when scope distinguishes production from QA. Pairs with report-writing and triage-validation.

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
