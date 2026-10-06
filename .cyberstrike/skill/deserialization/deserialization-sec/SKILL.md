---
name: deserialization-sec
description: >-
  Signal-driven insecure deserialization orchestration for Java, PHP, Python,
  .NET, Ruby, Node.js, serialization formats, gadget-chain discovery, and
  deserialization-to-RCE or impact chains.
category: injection
verified: official
tags: [deserialization, serialization, gadget-chain, rce, signal-driven]
tech_stack: [java, php, python, dotnet, ruby, nodejs, web]
cwe_ids: [CWE-502]
chains_with:
  - deserialization-insecure
  - hunt-deserialization
  - offensive-deserialization
  - command-injection-sec
  - jndi-injection
  - api-sec
  - cloud-sec
files: [SKILL.md]
---

# Deserialization Security Router

## Mission
Route only when concrete serialization/deserialization evidence exists. Keep the
existing specialists authoritative; this router coordinates detection, runtime
fingerprinting, safe validation, evidence, and specialist handoffs.

## Activation signals
Strong signals:
- serialized object signatures in a request, cookie, session, message, queue, or file
- Java AC ED, rO0AB, ObjectInputStream/readObject, XMLDecoder, XStream, or polymorphic Jackson type metadata
- PHP O:n: class-object serialization, unserialize, or phar:// reached from attacker input
- Python pickle/marshal/jsonpickle or unsafe YAML object construction
- .NET BinaryFormatter, LosFormatter/ViewState, NetDataContractSerializer, Json.NET type metadata
- Ruby Marshal/YAML object tags
- Node serialization markers such as _$$ND_FUNC$$_ or __js_function
- source/code evidence connecting attacker-controlled data to a deserialization sink
- concrete gadget-chain, callback, or controlled execution evidence

Do not activate from generic serialize, JSON, cookies, Base64, Java, PHP,
Python, or a scanner RCE label alone.

## Routing
- deserialization-insecure: comprehensive sink/fingerprint and language-specific playbook.
- hunt-deserialization: bug-bounty hunting and modern variant prioritization.
- offensive-deserialization: deeper gadget-chain and exploitation analysis.
- command-injection-sec: only after deserialization reaches a command/process sink.
- jndi-injection: only when JNDI is the concrete secondary boundary.
- api-sec: when the deserialization surface is an API protocol requiring API-specific analysis.
- cloud-sec: when the serialized input crosses a cloud/container control-plane boundary.

Prefer one primary specialist and add a secondary route only when evidence shows
a distinct security boundary or exploit chain.

## Analysis model
Normalize:
- target, endpoint/protocol, method/channel
- serialization format and fingerprint
- language/runtime/framework/version evidence
- source → encoding/transport → deserializer → object/type resolution → sink
- classpath/dependency or gadget availability
- integrity/signing/encryption controls
- sandbox/filter/allowlist/binder controls
- callback/execution evidence
- identity, scope, and provenance

## Validation lifecycle
signal → format-confirmed → sink-observed → controlled-deserialization →
execution-or-impact-proven → finding

Use the least invasive confirmation first. Prefer inert parsing, malformed-object
differentials, unique DNS/OOB callbacks, or controlled delay where appropriate.
Do not escalate to destructive payloads when a safer proof establishes the boundary.

A serialized-looking blob, parser error, class name, or gadget compatibility alone
is not a finding. A callback proves a network interaction; prove actual security
impact separately.

## Evidence and handoff
Preserve exact baseline/mutated artifacts, format fingerprint, runtime/version
evidence, sink location, filter state, identity context, timestamps, tool/source
provenance, and observed side effect. Handoffs must retain request/response or
message correlation and the evidence state.

## Bounds and deduplication
Canonical key:
target + channel + endpoint + format + runtime + deserializer + sink

Reuse equivalent evidence. Test one primary gadget/confirmation path at a time
with bounded variants justified by runtime evidence. Stop on confirmed impact,
clear non-exploitability, or diminishing evidence value.

## External resources
External gadget databases, writeups, and generators are reference material.
Select them only after a concrete runtime/format signal identifies a compatible
family; never bulk-load or blindly spray gadget chains.

## Safety
Authorized targets only. Use test identities, synthetic data, inert callbacks,
reversible actions, and minimal-impact validation.
