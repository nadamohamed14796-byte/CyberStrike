---
name: methodology
description: Canonical bug bounty methodology and workflow orchestrator. Use at the start of a hunt, when switching targets, planning assessment, deciding what to do next, validating a suspected issue, chaining findings, or preparing a report. Consolidates bb-methodology, bug-bounty workflow, and methodology-sec routing and evidence gates. Load security-arsenal separately only when concrete payloads, bypasses, or wordlists are needed.
category: methodology
tags: [methodology, bug-bounty, assessment, signal-driven, validation]
version: "2.0"
---

# Unified Bug Bounty Methodology

## Mission

Coordinate an authorized, evidence-led bug bounty workflow without treating every request, endpoint, subdomain, or JavaScript file as an independent target. Build and update a coherent understanding of the target, then select the smallest relevant skill or test.

## 1. Entry and scope gate

Before any active testing:
1. Identify the program and the exact asset being considered.
2. Confirm the asset against the current program scope, including wildcard semantics, exclusions, asset type, and any program-specific restrictions.
3. Check whether the planned test and its impact are permitted. Respect rate limits, test-account rules, data-handling requirements, and stop conditions.
4. If scope or authorization is uncertain, pause active testing and resolve the ambiguity first.

Never infer that a related hostname, vendor, API, CDN, IP address, or linked service is in scope merely because it is associated with the target.

## 2. Maintain target-level context

Treat the target as a connected system, not a pile of unrelated observations. Correlate, where available:
- Domains, subdomains, IPs, services, and ownership/hosting relationships.
- Applications, roles, account identities, permissions, and authentication state.
- JavaScript bundles, source maps, libraries, API routes, request/response pairs, parameters, and backend functions.
- Similar endpoints, shared identifiers, common middleware, and repeated behavior.
- Prior hypotheses, confirmed findings, useful negative results, and unresolved leads.

Preserve provenance and timestamps. Distinguish observed facts from assumptions and hypotheses. Reuse established context when the evidence supports the relationship; do not merge unrelated assets merely because names or technologies look similar.

## 3. Select the current phase from evidence

The workflow is non-linear. Choose the phase that best matches the current signal; revisit earlier phases when new evidence changes the model.

1. **Understand:** review scope, program rules, target history, known functionality, roles, and technology.
2. **Map:** discover assets, routes, client-side behavior, APIs, identity boundaries, and trust relationships.
3. **Hypothesize:** turn a concrete anomaly into a testable security hypothesis. Ask what the developer likely intended, what assumption may fail, and what changes across roles, objects, states, or request paths.
4. **Test:** use the least-invasive reproducible test that can confirm or reject the hypothesis.
5. **Correlate and chain:** investigate relationships across requests, responses, identities, code, endpoints, and infrastructure only when evidence supports a chain.
6. **Validate and report:** establish impact, capture reproducible evidence, assess severity, and route a confirmed issue to the appropriate reporting/triage skill.

Do not run every phase mechanically or invoke every skill on every target. Select skills only when their trigger matches a concrete need.

## 4. Hypothesis and test loop

For each lead, record:
- Signal and source.
- A concise hypothesis and the security boundary that may fail.
- Preconditions, relevant account/role, object, and application state.
- The smallest safe test that can distinguish the hypothesis from normal behavior.
- Expected secure behavior versus observed behavior.
- Evidence, outcome, confidence, and next step.

A failed hypothesis is useful learning. Record meaningful negative results so future sessions avoid repeating the same test without a changed premise.

## 5. Evidence and false-positive gate

A scanner alert, reflected input, exposed route, version string, suspicious source-code pattern, or theoretical attack path is not by itself a vulnerability.

Before calling something a finding, verify:
1. The affected asset is in scope.
2. The behavior is reproducible and evidence is attributable to the tested request/state.
3. A real security boundary or security property is violated.
4. The impact is demonstrated or tightly supported, not merely assumed.
5. Benign explanations and relevant control conditions have been considered.
6. The evidence supports the stated severity and affected component.
7. The report can explain clear reproduction steps without relying on hidden assumptions.

Use test accounts and synthetic data where possible. Do not access, retain, or expose unrelated users' data to prove impact. Stop when sufficient evidence has been collected.

## 6. Correlation and vulnerability chains

Chain issues only when each link is supported by evidence. For each link, document the prerequisite, observed behavior, and contribution to end impact. A collection of individually suspicious observations is not automatically a valid chain.

Prefer cross-layer reasoning when justified: browser/client code ↔ request/response ↔ API/backend behavior ↔ identity/authorization ↔ infrastructure. Do not assume that two endpoints share a backend or permission model without evidence.

## 7. Skill routing

- Use this unified methodology for planning, phase selection, hypothesis management, target-context correlation, and workflow decisions.
- Use vulnerability-specific skills for concrete leads such as IDOR, XSS, SSRF, authentication/authorization, injection, file handling, business logic, GraphQL, cloud configuration, or AI security.
- Load `security-arsenal` only when a specific test requires payloads, bypass tables, wordlists, or pattern references.
- Use the dedicated validation/triage and reporting skills for final submission decisions, severity, and report formatting. This methodology does not replace those specialist skills.
- Combine skills only when there is a concrete shared data flow, prerequisite, or exploit chain.

## 8. Reporting handoff

A handoff should include:
- In-scope asset and relevant program restrictions.
- Short title and vulnerability class.
- Preconditions and attacker capability.
- Exact reproducible steps with sanitized request/response evidence.
- Expected versus actual behavior.
- Demonstrated impact and affected security boundary.
- Scope of impact, limitations, and confidence.
- Relevant chain links, if any.
- Safe remediation direction.

Do not label an unverified lead as a confirmed finding. Do not overstate impact or severity.

## 9. Safety and stop conditions

Operate only on authorized targets. Avoid destructive actions, denial of service, persistence, unnecessary third-party data access, credential abuse, and out-of-scope testing. Stop if the test risks harm, exposes sensitive data, or conflicts with program rules.

## 10. Learning handoff

Store durable observations in the target knowledge/learning layer with source, timestamp, confidence, and outcome. Keep target knowledge separate from skill definitions: do not rewrite skills merely because one target behaved differently. Update methodology or skills only when a repeatable, generalizable improvement is justified.
