---
name: hunt-deserialization
description: Hunt Insecure Deserialization — Java gadget chains (ysoserial), PHP object injection (phpggc), Python pickle RCE, .NET BinaryFormatter, Ruby Marshal.load, JNDI/Log4Shell. RCE via deserialization is almost always Critical. Use when target runs Java, PHP serialization, Python pickle, .NET, or Ruby on Rails.
tags: [bug-bounty, security-testing, hunt, deserialization]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: input-validation
---

## CyberStrike load gate

Activate only when concrete deserialization evidence exists: serialized-object
signatures, a known deserializer sink, attacker-controlled type metadata, unsafe
object reconstruction, a framework-specific serialization boundary, or
reproducible deserialization behavior.

Do not activate from generic JSON/Base64/cookie/Java/PHP/Python keywords or a
scanner RCE label alone.

Evidence lifecycle:
signal -> format-confirmed -> sink-observed -> controlled-deserialization ->
execution-or-impact-proven -> finding

A serialized-looking blob, parser error, compatible gadget, or missing filter is
a candidate only. Prefer inert parsing, unique DNS/OOB confirmation, or bounded
delay before any higher-impact validation. Preserve exact request/response,
runtime/version, serializer, sink, identity, scope, and provenance.

Canonical deduplication key:
target + channel + endpoint + format + runtime + deserializer + sink

Use one primary validation path and only evidence-driven variants. Stop when
impact is reproduced, the hypothesis is disproven, or further testing has low
evidence value. Route orchestration through deserialization-sec and avoid
repeating evidence already established by another specialist.


# hunt-deserialization

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt Insecure Deserialization — Java gadget chains (ysoserial), PHP object injection (phpggc), Python pickle RCE, .NET BinaryFormatter, Ruby Marshal.load, JNDI/Log4Shell. RCE via deserialization is almost always Critical. Use when target runs Java, PHP serialization, Python pickle, .NET, or Ruby on Rails.

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
