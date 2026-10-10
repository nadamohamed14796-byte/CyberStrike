---
name: javascript_intelligence
description: Evidence-led JavaScript asset, route, source-map, and observed-request correlation for authorized web assessments.
agent: proxy-analyzer
agent_roles: [correlator]
risk_level: low
confidence_threshold: 0.5
maximum_parallel_tasks: 2
required_signals: [source_map_detected]
required_context: [authorized-scope]
dependencies: []
scope_requirements: [authorized-scope]
validation_requirements: [observed-request-response-correlation]
---

# JavaScript Intelligence

Use only JavaScript assets and browser/network observations from the explicitly authorized target.

## Workflow

1. Inventory observed JavaScript assets, URL, page context, content hash, and source-map availability.
2. Extract routes, API paths, methods, parameter names, feature flags, account or tenant context, and security-sensitive call sites.
3. Link every inferred route or function to the asset and source location; link to an HTTP request/response only when observed correlation evidence exists.
4. Distinguish static code indicators from executed behavior. Static references, comments, source maps, and guessed endpoints are leads, not proof.
5. Prioritize hypotheses using scope, authentication context, account/role boundaries, and concrete request/response evidence.
6. Return structured asset, function, endpoint, and evidence identifiers so the coordinator can persist and deduplicate them.

## Safety and evidence

Do not initiate requests to inferred hosts or paths without an independently verified scope decision. Never treat a discovered host as in-scope solely because a JavaScript bundle references it. Do not report a vulnerability without reproducible evidence and demonstrated impact.
