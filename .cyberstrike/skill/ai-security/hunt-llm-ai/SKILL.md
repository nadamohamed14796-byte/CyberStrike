---
name: hunt-llm-ai
description: Hunt LLM/AI feature bugs including prompt injection, indirect injection, tool abuse, exfiltration, and agentic AI security issues.
tags: [bug-bounty, security-testing, hunt, llm]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: web-testing
---

# hunt-llm-ai

## Purpose

Adapted for CyberStrike's signal-driven skill system to find LLM and AI feature weaknesses, including prompt injection, indirect prompt injection, exfiltration through tool use or markdown rendering, ASCII smuggling, and agent security issues.

## Trigger

Load this skill when the observed signal points to LLM or AI features with user-controlled input, tool access, agent workflows, or untrusted external data.

## Workflow

1. Confirm authorization and scope before testing.
2. Identify the concrete signal that triggered this capability.
3. Form a testable hypothesis from observed behavior, code, traffic, or technology fingerprints.
4. Validate with the smallest reproducible test needed.
5. Correlate related requests, responses, identity state, and infrastructure when the issue crosses layers.
6. Preserve reproducible evidence and route confirmed chains to the relevant validation or reporting skill.

## False-Positive Gate

A scanner alert, reflection, exposed endpoint, version string, or suspicious code pattern is not sufficient by itself. Require reproducible behavior and demonstrated security impact before treating the issue as valid.

## Routing

Use this skill when the signal is stronger than generic scanning. Combine with another skill only when there is a concrete chain or shared data flow.

## Safety

Use only on authorized targets. Prefer test accounts and synthetic data; avoid destructive actions, unnecessary access to third-party data, credential abuse, persistence, or disruption.

## Provenance

Adapted from the public Claude-BugHunter capability catalog for CyberStrike. This is an adapted skill and not a verbatim copy.
