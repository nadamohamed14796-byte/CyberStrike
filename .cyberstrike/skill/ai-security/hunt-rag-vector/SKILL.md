---
name: hunt-rag-vector
description: Hunt vector-store / embedding-layer weaknesses in RAG pipelines (OWASP LLM08 Vector and Embedding Weaknesses) — persistent corpus poisoning that survives across sessions and users (distinct from one-shot indirect prompt injection, which is owned by hunt-llm-ai), cross-tenant vector-database IDOR (unauthenticated or unscoped queries against Pinecone/Weaviate/Chroma/Milvus/Qdrant/pgvector), source-text/metadata leakage in similarity-search results, and retrieval-hijack via adversarial embedding proximity ('SEO poisoning' for RAG). Targets: any app with a shared knowledge base, document upload feeding a chatbot, or a directly reachable vector-DB port. Validate: a second, clean session/account must inherit a poisoned result, or a cross-tenant artifact must be independently verifiable — confabulation is not a finding, same bar as hunt-llm-ai. Use when target is RAG-backed, exposes a vector-DB port, or lets users upload documents that other users' queries later retrieve.
tags: [bug-bounty, security-testing, hunt, rag, vector]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: web-testing
---

# hunt-rag-vector

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt vector-store / embedding-layer weaknesses in RAG pipelines (OWASP LLM08 Vector and Embedding Weaknesses) — persistent corpus poisoning that survives across sessions and users (distinct from one-shot indirect prompt injection, which is owned by hunt-llm-ai), cross-tenant vector-database IDOR (unauthenticated or unscoped queries against Pinecone/Weaviate/Chroma/Milvus/Qdrant/pgvector), source-text/metadata leakage in similarity-search results, and retrieval-hijack via adversarial embedding proximity ('SEO poisoning' for RAG). Targets: any app with a shared knowledge base, document upload feeding a chatbot, or a directly reachable vector-DB port. Validate: a second, clean session/account must inherit a poisoned result, or a cross-tenant artifact must be independently verifiable — confabulation is not a finding, same bar as hunt-llm-ai. Use when target is RAG-backed, exposes a vector-DB port, or lets users upload documents that other users' queries later retrieve.

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
