---
name: hunt-sqli
description: Hunting skill for sqli vulnerabilities. Built from 12 public bug bounty reports including modern NoSQL injection (Rocket.Chat CVE-2021-22911 MongoDB $regex, Mongoose ORM CVE-2024-53900 $where bypass), modern ORM raw-fragment SQLi (Django CVE-2024-42005, Sequelize GHSA-wrh9-cjv3-2hpw), second-order SOQL injection (HackerOne Salesforce), time-based blind SQLi in GraphQL resolvers, and SQLi on OIDC-proxy backends. Use when hunting SQLi on any target. Dedicated NoSQL operator injection (MongoDB/CouchDB $where/$regex/$ne) is owned by hunt-nosqli — NoSQL appears here only as adjacent ORM/WAF context.
tags: [bug-bounty, security-testing, hunt, sqli]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: input-validation
---

# hunt-sqli

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunting skill for sqli vulnerabilities. Built from 12 public bug bounty reports including modern NoSQL injection (Rocket.Chat CVE-2021-22911 MongoDB $regex, Mongoose ORM CVE-2024-53900 $where bypass), modern ORM raw-fragment SQLi (Django CVE-2024-42005, Sequelize GHSA-wrh9-cjv3-2hpw), second-order SOQL injection (HackerOne Salesforce), time-based blind SQLi in GraphQL resolvers, and SQLi on OIDC-proxy backends. Use when hunting SQLi on any target. Dedicated NoSQL operator injection (MongoDB/CouchDB $where/$regex/$ne) is owned by hunt-nosqli — NoSQL appears here only as adjacent ORM/WAF context.

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
