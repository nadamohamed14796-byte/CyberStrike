---
name: security-arsenal
description: Reference skill for security-testing payloads, bypass tables, wordlists, gf patterns, and vulnerability-specific test patterns. Load only when a concrete, in-scope hypothesis needs these references. General planning and evidence gates live in ../SKILL.md.
tags: [bug-bounty, security-testing, security, arsenal]
version: "2.0"
category: web-testing
---

# Security Arsenal

## Purpose

Provide focused reference material for a specific, authorized test. This skill is not a general hunting workflow or a substitute for evidence-based validation.

## Trigger

Load only when a concrete hypothesis needs payloads, bypass references, wordlists, or pattern names for a relevant class such as XSS, SSRF, SQLi, XXE, NoSQL injection, command injection, SSTI, IDOR, path traversal, HTTP smuggling, WebSocket, or MFA bypass.

## Usage rules

1. Confirm the target and planned test are in scope before using any reference.
2. Choose references that match the observed technology, input location, parser, and security boundary. Do not spray every payload at every endpoint.
3. Use the least-invasive test that can confirm or reject the hypothesis.
4. Record the exact request, response, state, and result needed for reproducibility; redact secrets and unrelated user data.
5. A payload match, reflected string, scanner result, or successful bypass attempt is not automatically a reportable vulnerability. Follow the canonical methodology in [../SKILL.md](../SKILL.md) and the dedicated validation/triage skill to establish impact and submission eligibility.
6. Stop if testing risks disruption, sensitive-data exposure, or violation of program rules.

## Boundaries

This skill provides testing references only. It does not own scope decisions, target knowledge, the overall hunting workflow, false-positive policy, severity decisions, or final submission eligibility.

## Provenance

Adapted from the public **elementalsouls/Claude-BugHunter** capability catalog under **CC BY 4.0**. This is an adapted CyberStrike skill, not a verbatim copy.

Source: https://github.com/elementalsouls/Claude-BugHunter
