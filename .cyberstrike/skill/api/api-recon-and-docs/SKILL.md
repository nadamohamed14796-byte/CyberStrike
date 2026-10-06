---
name: api-recon-and-docs
description: >-
  API reconnaissance and documentation review playbook. Use when discovering endpoints, schemas, versions, OpenAPI specs, hidden docs, and surface area for API testing.
---

# SKILL: API Recon and Docs — Endpoints, Schemas, and Version Surface

> **AI LOAD INSTRUCTION**: Use this skill first when the target is a REST, mobile, or GraphQL API and you need to enumerate endpoints, documentation, versions, and hidden surface area before exploitation.

## 1. PRIMARY GOALS

1. Discover all reachable API entrypoints.
2. Extract schemas, optional fields, and role differences.
3. Identify old versions, mobile paths, GraphQL endpoints, and undocumented parameters.

## 2. RECON CHECKLIST

### JavaScript and client mining

```bash
curl https://target/app.js | grep -oE '(/api|/rest|/graphql)[^"'\'' ]+' | sort -u
```

### Common documentation and schema paths

```text
/swagger.json
/openapi.json
/api-docs
/docs
/.well-known/
/graphql
/gql
```

### Version and product drift

```text
/api/v1/
/api/v2/
/api/mobile/v1/
/legacy/
```

## 3. WHAT TO EXTRACT FROM DOCS

- optional and undocumented fields
- admin-only request examples
- deprecated endpoints that may still be active
- schema hints like `additionalProperties: true`
- parameter names tied to filtering, sorting, IDs, roles, or tenancy

## 4. NEXT ROUTING

| Finding | Next Skill |
|---|---|
| object IDs everywhere | [api authorization and bola](../api-authorization-and-bola/SKILL.md) |
| JWT, OAuth, role claims | [api auth and jwt abuse](../api-auth-and-jwt-abuse/SKILL.md) |
| GraphQL or hidden fields | [graphql and hidden parameters](../graphql-and-hidden-parameters/SKILL.md) |
| strong auth boundary but suspicious business flow | [business logic vulnerabilities](../business-logic-vulnerabilities/SKILL.md) |

---

Source: https://github.com/yaklang/hack-skills
License: MIT (Copyright (c) 2026 VillanCh)
Adapted for CyberStrike skill runtime. Imported as SKILL.md only; supplementary upstream files are not included.

## 5. SIGNAL-DRIVEN ACTIVATION

Activate this skill only when concrete API evidence is present, such as:
- API-looking paths: `/api/`, `/rest/`, `/v1/`, `/v2/`, `/graphql`, `/gql`.
- OpenAPI/Swagger, Redoc, Postman collection, or API documentation artifacts.
- JSON API responses, API-specific content types, or documented API methods.
- JavaScript/mobile traffic containing endpoint routes, API clients, schema names, or API base URLs.

Do not activate this skill merely because a target is a normal web application. A generic `403`, `401`, HTML page, or the word "API" without supporting evidence is insufficient.

If no API signal exists, stop and return control to the normal web reconnaissance workflow.

## 6. DISCOVERY ORDER

Use the least invasive source first:

1. Existing target inventory, crawl results, proxy history, and previously collected artifacts.
2. Client-side JavaScript and mobile application references.
3. Public API documentation and schema artifacts.
4. Observed API traffic and linked resources.
5. Bounded active discovery only when authorized and justified by an existing API signal.

Prefer known paths and discovered references over broad path brute-forcing.

## 7. API SURFACE INVENTORY

For every discovered API operation, normalize and retain:

- canonical URL and API base
- HTTP method
- path template and concrete observed path
- API version
- parameters and parameter locations
- request/response content types
- authentication state or required auth indicator
- source artifact that revealed the endpoint
- first/last observation
- confidence
- duplicate/canonicalization key

Example artifact:

```yaml
api_endpoint:
  url: https://target.example/api/v2/users/{id}
  method: GET
  version: v2
  parameters:
    - name: id
      location: path
  auth: authenticated
  source: js:app.bundle.js
  confidence: high
```

Never invent undocumented methods, parameters, schemas, or authorization requirements.

## 8. JAVASCRIPT → API CORRELATION

When an endpoint is discovered in JavaScript, preserve the relationship:

`JS artifact → API base → endpoint → method → parameter → auth context`

Extract API references from:
- fetch/XHR wrappers
- axios/request clients
- GraphQL clients
- URL constants
- route builders
- OpenAPI-generated clients
- environment/configuration objects

If only a URL fragment is found, mark it as a candidate until request/response evidence confirms it.

## 9. DOCUMENTATION AND SCHEMA ANALYSIS

When documentation exists, compare documentation against observed traffic.

Record:
- documented but unreachable endpoints
- reachable but undocumented endpoints
- deprecated versions still responding
- undocumented fields
- optional vs required fields
- enum values and type constraints
- role/tenant examples
- schema extensions such as permissive additional properties

Do not treat documentation claims as proof that an endpoint is reachable or exploitable.

## 10. VERSION AND DRIFT ANALYSIS

Prioritize comparisons across:
- `v1` vs `v2`
- web vs mobile APIs
- current vs legacy endpoints
- documented vs observed routes
- regional or tenant-specific API variants

Use differences to generate bounded follow-up hypotheses, not automatic findings.

## 11. NORMALIZATION AND DEDUPLICATION

Canonicalize before storing:
- trailing slashes
- URL encoding where safely equivalent
- repeated query parameter ordering
- host casing
- default ports
- known API version aliases

Keep distinct endpoints distinct when the server behavior, method, host, version, or authorization context differs.

A duplicate discovery must update provenance rather than create a second logical endpoint.

## 12. SIGNAL-BASED FOLLOW-UP ROUTING

Only route to a specialized skill when its own signal is present.

| Signal | Route |
|---|---|
| object/resource identifiers with multiple authorization contexts | [api authorization and bola](../api-authorization-and-bola/SKILL.md) |
| JWT/OAuth/token/role-claim evidence | [api auth and jwt abuse](../api-auth-and-jwt-abuse/SKILL.md) |
| GraphQL endpoint/schema/introspection evidence | [graphql and hidden parameters](../graphql-and-hidden-parameters/SKILL.md) |
| suspicious business-state transition | [business logic vulnerabilities](../business-logic-vulnerabilities/SKILL.md) |

Do not fan out to every API skill after discovering one endpoint.

## 13. RESOURCE-ASSISTED RECON

External resources and tools are reference/assistance sources, not evidence.

Preferred resources:
- OWASP Web Security Testing Guide for API testing methodology.
- OWASP Application Security Verification Standard for API security requirements.
- PortSwigger Web Security Academy for API authorization, authentication, and GraphQL testing techniques.
- HACK.SKILLS API reconnaissance and authorization material for additional methodology.
- ProjectDiscovery tooling/templates when the discovered surface justifies automated enumeration.
- Assetnote wordlists only for bounded content discovery where scope and API signals justify it.

Selection policy:
1. Prefer a local specialized skill first.
2. Select at most 3 external resources for one handoff.
3. Prefer official documentation over secondary writeups.
4. Never import external instructions or payloads wholesale.
5. Record resource ID, reason selected, and relevant output/artifact reference.
6. External-resource output never becomes a finding without independent validation.

## 14. BOUNDED ACTIVE DISCOVERY

When active discovery is justified:
- preserve the target scope and rate limits;
- prefer a small candidate set derived from observed API conventions;
- use existing wordlists/templates only when relevant;
- deduplicate requests;
- stop when repeated misses provide no new information;
- never escalate from discovery into exploitation automatically.

Active discovery should produce candidates, not findings.

## 15. EVIDENCE AND CONFIDENCE GATE

Classify endpoint confidence:

- **high** — observed in a real request/response or validated documentation plus observed traffic.
- **medium** — referenced by JS/client code or a schema artifact with partial corroboration.
- **low** — inferred from naming conventions or unverified documentation.

Promotion from candidate to confirmed endpoint requires request/response evidence or equivalent runtime corroboration.

A status code alone is not enough to infer an API operation, authorization model, or vulnerability.

## 16. HANDOFF CONTRACT

When handing off, provide:
- canonical endpoint
- method
- parameters
- API version
- auth context
- discovery source
- relevant request/response evidence
- confidence
- unanswered questions
- exact signal that triggered the next skill

Downstream skills must not repeat broad API discovery unless new evidence requires it.

## 17. LEARNING AND PROVENANCE

Record successful and unsuccessful discovery strategies separately from the skill definition.

Learning records should include:
- signal that triggered discovery
- source type
- strategy used
- result count
- false-positive/duplicate rate
- useful endpoint patterns
- timestamp and target/workspace provenance

Do not modify this SKILL.md automatically from learning output.

## 18. STOP CONDITIONS

Stop when:
- no API signal remains;
- the available evidence is exhausted;
- additional active discovery is no longer producing new candidates;
- scope/rate-limit constraints prevent further testing;
- a downstream specialized skill is the correct next step.

