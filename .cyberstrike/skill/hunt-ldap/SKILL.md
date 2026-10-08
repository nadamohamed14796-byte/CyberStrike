---
name: hunt-ldap
description: Hunt LDAP Injection and XPath Injection — authentication bypass, blind char-by-char attribute exfiltration, AD user/group enumeration, XML-store XPath bypass. Covers the LDAP special-character set (* ( ) \\ NUL /), search-filter-context vs DN-injection, parenthesis-balancing, AND/OR filter logic, and {SSHA}/{CRYPT} userPassword exfil on non-AD directories. Use when target uses LDAP/AD authentication, corporate SSO with a directory backend, an address-book/people-search API, or XML-based data stores queried with XPath.
tags: [bug-bounty, security-testing, hunt, ldap]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: input-validation
---

# hunt-ldap

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt LDAP Injection and XPath Injection — authentication bypass, blind char-by-char attribute exfiltration, AD user/group enumeration, XML-store XPath bypass. Covers the LDAP special-character set (* ( ) \\ NUL /), search-filter-context vs DN-injection, parenthesis-balancing, AND/OR filter logic, and {SSHA}/{CRYPT} userPassword exfil on non-AD directories. Use when target uses LDAP/AD authentication, corporate SSO with a directory backend, an address-book/people-search API, or XML-based data stores queried with XPath.

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
