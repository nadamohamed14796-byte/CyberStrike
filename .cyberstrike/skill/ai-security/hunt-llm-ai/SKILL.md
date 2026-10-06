---
name: hunt-llm-ai
description: Hunt LLM/AI feature bugs — prompt injection, indirect injection, exfiltration via tool-use/markdown, ASCII smuggling, agentic AI security (OWASP Agentic Apps 2026, ASI01-ASI10). Patterns: direct injection ('ignore previous instructions'), indirect injection via documents/web pages/email the model reads, ASCII smuggling (Unicode Tags block U+E0000-U+E007F, invisible to humans, decoded by the model), tool-use exfiltration (model has fetch/browse tool, attacker injects OOB URL, model exfils chat history/secrets), markdown-image zero-click exfil, system-prompt extraction, IDOR-via-AI (cross-tenant data). Targets: chatbots, RAG, summarizers, agentic copilots, MCP tools. Detection: any LLM-backed endpoint, doc upload triggering AI processing, autonomous agent with tools. Validate: OOB/Collaborator callback for exfil, verbatim-reproducible system-prompt leak (run twice), verifiable cross-tenant leak or RCE. Confabulation is NOT a finding. Use when hunting AI features, chatbots, RAG, agentic systems, MCP.
tags: [bug-bounty, security-testing, hunt, llm]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: web-testing
---

# hunt-llm-ai

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt LLM/AI feature bugs — prompt injection, indirect injection, exfiltration via tool-use/markdown, ASCII smuggling, agentic AI security (OWASP Agentic Apps 2026, ASI01-ASI10). Patterns: direct injection ('ignore previous instructions'), indirect injection via documents/web pages/email the model reads, ASCII smuggling (Unicode Tags block U+E0000-U+E007F, invisible to humans, decoded by the model), tool-use exfiltration (model has fetch/browse tool, attacker injects OOB URL, model exfils chat history/secrets), markdown-image zero-click exfil, system-prompt extraction, IDOR-via-AI (cross-tenant data). Targets: chatbots, RAG, summarizers, agentic copilots, MCP tools. Detection: any LLM-backed endpoint, doc upload triggering AI processing, autonomous agent with tools. Validate: OOB/Collaborator callback for exfil, verbatim-reproducible system-prompt leak (run twice), verifiable cross-tenant leak or RCE. Confabulation is NOT a finding. Use when hunting AI features, chatbots, RAG, agentic systems, MCP.

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
