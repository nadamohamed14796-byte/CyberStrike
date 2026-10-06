---
name: api-sec
description: >-
  Entry P1 category router for API security. Use when choosing between API
  recon, authorization, token abuse, and hidden-parameter workflows before any
  deeper API topic skill.
---

# API Security Router

This is the routing entry point for API security testing.

Use this skill first to decide whether the API issue is mostly recon/docs, object authorization, token trust, or GraphQL/hidden parameters, then route to a deeper topic skill.

## When to Use

- The target exposes REST APIs, mobile backends, or GraphQL endpoints
- You need to define API testing order before going into specific topics
- You want to handle object authorization, JWT, GraphQL, and hidden fields as separate tracks

## Skill Map

- [API Recon and Docs](../api-recon-and-docs/SKILL.md): OpenAPI, Swagger, version drift, hidden documentation
- [API Authorization and BOLA](../api-authorization-and-bola/SKILL.md): BOLA, BFLA, method abuse, hidden writable fields
- [API Auth and JWT Abuse](../api-auth-and-jwt-abuse/SKILL.md): bearer token, header trust, claim abuse, rate-limit bypass
- [GraphQL and Hidden Parameters](../graphql-and-hidden-parameters/SKILL.md): introspection, batching, undocumented fields, hidden parameters

## Quick Triage

| Observation | Route |
|---|---|
| Swagger or OpenAPI is present | [api-recon-and-docs](../api-recon-and-docs/SKILL.md) |
| IDs appear in URL, JSON, headers, or GraphQL args | [api-authorization-and-bola](../api-authorization-and-bola/SKILL.md) |
| JWT token visible in traffic | [api-auth-and-jwt-abuse](../api-auth-and-jwt-abuse/SKILL.md) |
| `/graphql` or batched JSON arrays are present | [graphql-and-hidden-parameters](../graphql-and-hidden-parameters/SKILL.md) |
| Registration, login, or profile updates accept extra fields | [api-authorization-and-bola](../api-authorization-and-bola/SKILL.md) then [api-auth-and-jwt-abuse](../api-auth-and-jwt-abuse/SKILL.md) |

## Recommended Flow

1. Start with exposed endpoints and documentation assets
2. Then evaluate object-level and function-level authorization
3. Then evaluate token, header, signature, and rate-limit boundaries
4. If GraphQL or complex JSON is present, continue with hidden fields and schema abuse

## Related Categories

- [auth-sec](../auth-sec/SKILL.md)
- [business-logic-vuln](../business-logic-vuln/SKILL.md)
- [recon-for-sec](../recon-for-sec/SKILL.md)

---

Source: https://github.com/yaklang/hack-skills
License: MIT (Copyright (c) 2026 VillanCh)
Adapted for CyberStrike skill runtime. Imported as SKILL.md only; supplementary upstream files are not included.

## Extended API Orchestration Layer

This router is the single API entry point for the broader API cluster. The specialist skills remain intact and are loaded on demand; this file does not replace, delete, merge, or duplicate their detailed playbooks.

### Cluster Specialists

| Signal / responsibility | Specialist |
|---|---|
| Endpoint, schema, documentation, API-version discovery | [api-recon-and-docs](../api-recon-and-docs/SKILL.md) |
| General REST/gRPC/WebSocket API security testing | [offensive-api-security](../offensive-api-security/SKILL.md) |
| Business misuse, workflow abuse, resource/transaction abuse | [offensive-api-abuse](../offensive-api-abuse/SKILL.md) |
| SPA JavaScript to backend API correlation and auth-boundary checks | [hunt-spa-api](../hunt-spa-api/SKILL.md) |
| Shadow/zombie/legacy/undocumented API inventory and behavioral drift | [hunt-shadow-api](../hunt-shadow-api/SKILL.md) |
| API misconfiguration, mass assignment, prototype-pollution and verb-handling checks | [hunt-api-misconfig](../hunt-api-misconfig/SKILL.md) |

The existing specialist files are authoritative for their detailed procedures. The router decides whether and when to load them.

## 1. ROUTER ENTRY GATE

Do not load the full API cluster merely because the target is a web application.

Require at least one concrete API signal:
- observed API request/response;
- /api/, /rest/, versioned API path, GraphQL, gRPC, or WebSocket evidence;
- OpenAPI/Swagger/Redoc/Postman/API schema artifact;
- JavaScript/mobile code containing API routes or API client calls;
- JSON API content type or API-specific response structure;
- API host/subdomain discovered from an authorized asset inventory.

If there is no concrete signal, route back to normal web reconnaissance.

## 2. SIGNAL SCORING

Use evidence strength instead of keyword-only activation.

| Signal | Strength | Default route |
|---|---:|---|
| Real API request/response | 5 | recon + inventory |
| OpenAPI/Swagger schema | 5 | recon + contract analysis |
| GraphQL endpoint/schema | 5 | recon, then GraphQL specialist |
| SPA JS contains concrete API route | 4 | SPA specialist + recon |
| Multiple API versions / deprecated docs | 4 | shadow API specialist |
| Undocumented method/parameter observed | 4 | recon + misconfig/security |
| Object IDs across identities | 5 | authorization specialist |
| JWT/OAuth/API-key evidence | 5 | auth/JWT specialist |
| Business-state or transaction endpoint | 4 | abuse specialist |
| gRPC reflection/service descriptors | 5 | offensive API specialist |
| WebSocket API traffic | 5 | offensive API specialist |
| Generic word such as API in page text | 0 | no API activation |

Do not route on a score alone when the signal is ambiguous; retain the evidence that produced the score.

## 3. ORCHESTRATION ORDER

Use this order unless stronger evidence justifies a different branch:

1. Recon and inventory — establish the API surface and provenance.
2. Client correlation — correlate SPA/mobile/JS routes with observed traffic.
3. Documentation/contract comparison — compare documented versus observed behavior.
4. Shadow/version analysis — investigate old, beta, legacy, mobile, or undocumented variants.
5. Security testing — select only the specialist whose signal is present.
6. Abuse/logic testing — only for stateful or business-sensitive operations.
7. Validation — independently reproduce security-impacting behavior.
8. Handoff/reporting — pass evidence, not scanner suspicion.

Do not launch all specialists in parallel.

## 4. ROUTING MATRIX

| Observed evidence | Load |
|---|---|
| OpenAPI/Swagger/docs/specs | api-recon-and-docs |
| JS-heavy SPA + concrete API routes | hunt-spa-api, then api-recon-and-docs |
| v1/v2/beta/legacy or mobile drift | hunt-shadow-api |
| undocumented endpoint/method/parameter | api-recon-and-docs; then the specialist matching its behavior |
| object IDs + multiple user/tenant contexts | api authorization and BOLA |
| JWT/OAuth/API-key/token evidence | api auth and jwt abuse |
| GraphQL endpoint/schema | graphql and hidden parameters |
| business transaction/state machine | offensive-api-abuse + business-logic specialist when warranted |
| mass-assignment-like fields | hunt-api-misconfig |
| prototype-pollution indicators | hunt-api-misconfig |
| HTTP verb/method-override anomaly | hunt-api-misconfig |
| broad REST/gRPC/WebSocket surface requiring protocol testing | offensive-api-security |
| API misconfiguration evidence | hunt-api-misconfig |
| third-party API integration or server-side fetch behavior | offensive-api-security / SSRF specialist based on concrete evidence |

A specialist may hand off to another specialist only when it produces the next specialist's required signal.

## 5. API SURFACE MODEL

Maintain one canonical API inventory for the cluster.

Each endpoint record should preserve:

    endpoint:
      canonical_url:
      host:
      path_template:
      method:
      version:
      protocol:
      parameters: []
      request_content_type:
      response_content_type:
      auth_context:
      identity_context:
      source_artifacts: []
      first_seen:
      last_seen:
      confidence:
      signals: []
      specialist_history: []

Multiple discoveries of the same operation update provenance instead of creating duplicate logical endpoints.

Keep separate records when any of these materially differ:
- host;
- HTTP method;
- API version;
- authorization context;
- protocol;
- server behavior.

## 6. DOCUMENTATION ↔ IMPLEMENTATION DIFFERENTIAL

The orchestrator should explicitly compare:
- documented vs reachable;
- reachable vs documented;
- current vs deprecated versions;
- web vs mobile routes;
- JS-discovered vs specification routes;
- documented parameters vs accepted parameters;
- documented auth requirements vs observed auth behavior;
- documented response schema vs actual response.

A discrepancy is a lead, not automatically a vulnerability.

This matters especially for API inventory management: old versions, exposed debug endpoints, and stale documentation can create attack surface even when the current API is correctly protected.

## 7. SPA AND SHADOW-API COORDINATION

Avoid duplicate work.

SPA path:
SPA signal → hunt-spa-api → endpoint artifacts → api-recon-and-docs → security specialist

Shadow path:
version/legacy/mobile drift → hunt-shadow-api → version inventory → behavioral differential → relevant security specialist

If both signals exist, run the shared API inventory once and let both specialists consume the same evidence.

Never make hunt-spa-api and hunt-shadow-api independently crawl the same surface without a new hypothesis.

## 8. MISCONFIGURATION ROUTING

Use hunt-api-misconfig only when a concrete misconfiguration signal exists.

Examples:
- extra writable properties accepted;
- unexpected HTTP method behavior;
- method-override behavior;
- prototype-pollution-relevant input path;
- exposed API configuration/debug behavior.

Do not classify a missing header, unusual status code, or exposed documentation alone as a vulnerability.

## 9. ABUSE / BUSINESS-FLOW ROUTING

Use offensive-api-abuse when the API exposes a stateful business operation such as:
- money/credit/reward transfer;
- checkout/order/payment state;
- invitations or quota allocation;
- account recovery/state transitions;
- coupon/discount/reward logic;
- workflow steps that may be reordered or repeated.

Preserve a state-machine model:

state → request → server transition → next state → invariant

A valid request is not a finding by itself. Require a violated invariant and security/business impact.

## 10. PROTOCOL ROUTING

offensive-api-security owns protocol-specific coverage when evidence indicates:
- REST semantics beyond the narrower specialist tracks;
- gRPC services/reflection/protobuf;
- WebSocket connections/messages/origin handling;
- protocol-specific authentication or metadata behavior.

Do not invoke protocol-specific testing for an unconfirmed protocol.

## 11. EXTERNAL RESOURCE REGISTRY

External resources are conditional references, not automatic instructions and never evidence by themselves.

### Tier 1 — Standards and primary methodology

- OWASP API Security Top 10 2023 — use as the risk taxonomy and coverage matrix.
- OWASP Web Security Testing Guide — use for API testing methodology and verification structure.
- OWASP ASVS — use for control requirements and expected security properties.
- RFCs/specifications relevant to the observed protocol (HTTP, OAuth, JWT, GraphQL, gRPC, WebSocket).

### Tier 2 — Practical testing methodology

- PortSwigger Web Security Academy — use when the observed API technology maps to API authorization, GraphQL, race-condition, SSRF, or request-handling labs.
- Postman documentation — use when Postman collections, API examples, schemas, or collection-derived contracts are discovered.
- 42Crunch API Security Audit material — use for OpenAPI/GraphQL contract-quality and specification-vs-implementation differential thinking.

### Tier 3 — Agent/tooling knowledge

- HACK.SKILLS API category and deep API skills — use for additional routing patterns and specialist methodology.
- ProjectDiscovery Nuclei — use when an OpenAPI/Swagger specification or concrete HTTP request corpus justifies template-based validation.
- ProjectDiscovery Katana/httpx ecosystem — use for bounded live API surface discovery when the existing inventory requires it.
- Assetnote/Kiterunner-style API wordlists and tooling — use only for targeted content discovery when an API naming convention or observed prefix provides a concrete hypothesis.

### Resource selection policy

1. Prefer the local CyberStrike specialist skill first.
2. Prefer primary/official sources for standards and protocol behavior.
3. Select at most 3 external resources for a single handoff.
4. Do not import external instructions, payloads, or wordlists wholesale into runtime context.
5. Record resource_id, selection reason, source/version/date, and output artifact reference.
6. External resource output can create a candidate but cannot create a finding.
7. If a resource fails, do not retry indefinitely; continue with local evidence.

## 12. TOOL SELECTION POLICY

Select tools from evidence, not from a fixed API mega-chain.

| Need | Candidate tools |
|---|---|
| HTTP/API probing | curl, Burp Suite |
| JS/API route extraction | existing JS mining/crawler pipeline |
| API parameter discovery | Arjun or equivalent, only after endpoint evidence |
| API content discovery | ffuf/Kiterunner-style workflow, bounded by discovered prefix |
| OpenAPI-driven requests | Nuclei OpenAPI input or equivalent |
| REST collection testing | Postman/collection-compatible workflow |
| GraphQL | Burp/GraphQL-specific tooling |
| gRPC | grpcurl |
| WebSocket | Burp/websocat/mitmproxy |
| HTTP crawling | Katana when live crawling is justified |

Tool availability must be checked before execution. Missing tools are not a reason to broaden scope or substitute an unrelated scanner.

## 13. BOUNDED EXECUTION BUDGET

Per orchestration cycle:
- one canonical API inventory;
- one primary discovery source at a time;
- at most 3 specialist handoffs without new evidence;
- at most 3 external resources per handoff;
- deduplicate equivalent requests;
- stop repeated discovery when no materially new endpoints or behaviors appear;
- active probing must respect target scope and known rate limits.

A new specialist invocation requires either:
1. a new concrete signal, or
2. a new hypothesis derived from an existing artifact.

## 14. EVIDENCE GATE

Classify observations:
- candidate — inferred from naming, docs, code, or scanner output;
- observed — confirmed request/response behavior;
- validated — reproducible security boundary failure;
- finding — validated behavior with demonstrated impact and sufficient evidence.

Never promote:
- status-code differences alone;
- endpoint existence alone;
- reflection alone;
- documentation exposure alone;
- version strings alone;
- scanner severity alone.

## 15. CROSS-SKILL HANDOFF CONTRACT

Every handoff must include:
- target/scope reference;
- canonical endpoint;
- method/protocol;
- request/response artifact;
- auth/identity context;
- discovered parameters;
- source artifact;
- exact triggering signal;
- confidence;
- prior specialist actions;
- unanswered question;
- expected evidence required to promote the hypothesis.

The receiving specialist should consume this artifact rather than rediscovering the entire API surface.

## 16. LEARNING AND PROVENANCE

Store learning outside skill definitions.

Record:
- trigger signal;
- specialist selected;
- resource/tool selected;
- result count;
- duplicate rate;
- false-positive rate;
- useful endpoint/version patterns;
- failed strategies;
- validation outcome;
- target/workspace provenance;
- timestamp.

Do not rewrite specialist SKILL.md files from runtime learning.

## 17. FAILURE RECOVERY

If a specialist fails:
1. preserve its partial artifacts;
2. classify the failure as tooling, scope, authentication, rate limiting, protocol, or evidence deficiency;
3. do not restart the entire API cluster;
4. route only the affected branch to an appropriate fallback;
5. keep the existing inventory and provenance.

## 18. STOP CONDITIONS

Stop the API orchestration cycle when:
- no concrete API signal remains;
- the API inventory is stable and additional discovery produces only duplicates;
- no specialist has a new evidence-backed hypothesis;
- scope/rate limits prevent safe continuation;
- validation has reached the required evidence threshold;
- the next action belongs to a non-API category.

## 19. RESOURCE COVERAGE CHECK

Before declaring the API orchestration layer complete, verify that the current plan has coverage for:
- REST/API inventory;
- OpenAPI/Swagger and contract analysis;
- GraphQL;
- gRPC;
- WebSocket;
- SPA/JS API discovery;
- shadow/zombie/legacy APIs;
- authentication/token boundaries;
- object/function authorization;
- API misconfiguration;
- business-flow abuse;
- SSRF and third-party API consumption;
- rate/resource controls;
- version drift;
- undocumented parameters/methods;
- evidence/false-positive control;
- tool/resource provenance.

Missing coverage should trigger a targeted specialist lookup, not a broad mega-scan.

## Resource Basis

The orchestration design was cross-checked against OWASP API Security Top 10 coverage (including authorization, authentication, resource consumption, business-flow abuse, SSRF, misconfiguration, inventory management, and unsafe API consumption), PortSwigger GraphQL/API testing material, HACK.SKILLS' master/category/deep-topic routing model, Postman API collections, 42Crunch OpenAPI/GraphQL contract auditing, and ProjectDiscovery's OpenAPI-aware Nuclei workflow. These sources are references for routing and methodology; the local CyberStrike specialist skills remain the execution authority.
