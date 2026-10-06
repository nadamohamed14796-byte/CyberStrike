---
name: hunt-rag-vector
description: Hunt vector-store and embedding-layer weaknesses in RAG pipelines, including persistent corpus poisoning and retrieval manipulation that survives across sessions and users.
tags: [bug-bounty, security-testing, hunt, rag, vector]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: web-testing
---

# hunt-rag-vector

## Purpose

Adapted for CyberStrike's signal-driven skill system to identify weaknesses in vector stores, embedding layers, retrieval pipelines, and persistence across user or session boundaries.

## Trigger

Use this skill when a target exposes a retrieval pipeline, vector database, embedding service, or context layer that could be poisoned or manipulated in a way that impacts downstream LLM behavior or application trust.

## Workflow

1. Confirm authorization and scope before testing.
2. Identify the concrete signal that triggered this capability.
3. Form a testable hypothesis from observed behavior, code, traffic, or technology fingerprints.
4. Validate with the smallest reproducible test needed to establish the security boundary failure.
5. Correlate related requests, responses, client code, identity state, and infrastructure when the issue crosses layers.
6. Preserve reproducible evidence and route confirmed chains to the relevant validation or reporting skill.

## False-Positive Gate

A scanner alert, reflection, exposed endpoint, version string, or suspicious code pattern is not sufficient by itself. Require a reproducible behavior and demonstrated security impact before treating it as a valid issue.

## Routing

Load this skill when the signal is stronger than generic scanning. Combine with another skill only when there is a concrete chain or shared data flow.

## Safety

Use only on authorized targets. Prefer test accounts and synthetic data; avoid destructive actions, unnecessary access to third-party data, credential abuse, persistence, or disruption.

## Provenance

Adapted from the public Claude-BugHunter capability catalog for CyberStrike. This is an adapted skill and not a verbatim copy.
