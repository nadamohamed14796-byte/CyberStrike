---
name: hunt-csrf
description: Hunting skill for csrf vulnerabilities. Built from 15 public bug bounty reports including modern variants — SameSite=Lax sibling-subdomain bypass (Argo CD CVE-2024-22424), GraphQL mutations-via-GET (GitLab $3,370), framework-wide CSRF middleware disabled (Stripe Dashboard $5,000), path-traversal CSRF-token bypass (GitHub Enterprise CVE-2022-23732 $10k), Origin-omission bypass (TikTok $2,500), OAuth-state null-byte (Streamlabs), WebSocket CSRF / CSWSH (Coda), default-SameSite email-change → ATO (YoYo Games $400), social-account-link CSRF (HackerOne), JSON-CSRF via text/plain on email-change (TikTok $500). Use when hunting modern CSRF — heavy emphasis on chain-to-ATO patterns.
tags: [bug-bounty, security-testing, hunt, csrf]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: web-testing
---

# hunt-csrf

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunting skill for csrf vulnerabilities. Built from 15 public bug bounty reports including modern variants — SameSite=Lax sibling-subdomain bypass (Argo CD CVE-2024-22424), GraphQL mutations-via-GET (GitLab $3,370), framework-wide CSRF middleware disabled (Stripe Dashboard $5,000), path-traversal CSRF-token bypass (GitHub Enterprise CVE-2022-23732 $10k), Origin-omission bypass (TikTok $2,500), OAuth-state null-byte (Streamlabs), WebSocket CSRF / CSWSH (Coda), default-SameSite email-change → ATO (YoYo Games $400), social-account-link CSRF (HackerOne), JSON-CSRF via text/plain on email-change (TikTok $500). Use when hunting modern CSRF — heavy emphasis on chain-to-ATO patterns.

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
