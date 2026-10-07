---
name: recon-sec
description: Signal-driven reconnaissance orchestration for scoped asset discovery, endpoint mapping, technology identification, and attack-surface correlation.
category: reconnaissance
verified: official
tags: [recon, asset-discovery, subdomain, endpoint, javascript, osint, signal-driven]
chains_with:
  - recon-for-sec
  - recon-toolchain
  - recon-scope-triage
  - attack-surface-mapping
  - subdomain-enumeration
  - subdomain-takeover
  - vhost-enumeration
  - web-enumeration
  - js-secrets-extraction
  - api-noauth-hunt
  - origin-ip-discovery
  - port-service-discovery
  - tls-fingerprint-impersonation
files: [SKILL.md]
---

# Recon Security Router

## Mission
Coordinate reconnaissance as a scoped, evidence-driven pipeline. Do not run every
enumerator merely because a domain exists. Select the smallest discovery stage
supported by the current evidence and preserve results between stages.

## Activation signals
- explicit in-scope root domain, wildcard, IP range, application, or asset inventory
- new hostname/subdomain evidence
- DNS, certificate, ASN, cloud, or vhost relationship
- live HTTP service requiring technology or endpoint discovery
- JavaScript bundle or source artifact requiring endpoint/secret correlation
- API/documentation/schema evidence
- stale, dangling, takeover-like, or ownership-change signal
- service/port evidence requiring protocol identification
- observed scope expansion or asset change

## Non-signals
Do not activate broad recon from generic words such as "scan", "enumerate", "subdomain",
or "recon" without an authorized target and concrete discovery objective.

## Pipeline
1. Scope and authorization gate.
2. Normalize root assets and canonical target identifiers.
3. Passive discovery first: DNS, certificates, public code/OSINT, historical URLs.
4. Resolve and deduplicate hosts.
5. HTTP/service validation.
6. Technology and application mapping.
7. Endpoint/URL/parameter/JS correlation.
8. Specialized discovery only when evidence triggers it.
9. Prioritize assets by exposure, novelty, confidence, and likely impact.
10. Persist provenance, timestamps, tool versions, and negative results.

## Tool families
Use available specialists/tools for subdomains, DNS, certificates, HTTP probing,
URL archives/crawlers, JavaScript analysis, parameter discovery, port/service
discovery, cloud/code intelligence, and visual/application mapping. Do not launch
all families automatically.

## Evidence lifecycle
scope-confirmed -> asset-observed -> asset-validated -> correlated -> prioritized -> handoff

An unverified hostname, scanner hit, technology guess, or historical URL is not
automatically a live finding.

## Bounds and deduplication
Canonical asset key: normalized hostname/IP + port + protocol.
Canonical URL key: scheme + host + normalized path + parameter set.
Reuse previous results and only run a new discovery family when it can add information.
Record source, first/last seen, confidence, scope status, and discovery method.

## Handoff
Pass normalized asset, scope decision, evidence source, discovery timestamp, tool
provenance, related assets, confidence, and next justified discovery stage.

## Safety
Only enumerate authorized targets and respect program scope/rate limits. Prefer
passive collection and low-impact validation before active discovery.
