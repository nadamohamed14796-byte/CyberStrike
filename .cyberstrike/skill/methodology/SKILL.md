---
name: methodology
description: >-
  Canonical bug bounty assessment methodology and workflow orchestrator.
  Use at the beginning of an authorized assessment, when switching targets,
  evaluating new evidence, selecting the next testing action, validating a
  suspected vulnerability, correlating related components, assessing exploit
  chains, or preparing a reporting handoff. Consolidates assessment planning,
  evidence-driven workflow management, hypothesis validation, and specialist
  skill routing. Load security-arsenal separately only when a specific test
  requires concrete payloads, bypass references, or wordlists.
category: methodology
tags:
  - methodology
  - bug-bounty
  - assessment
  - target-intelligence
  - evidence-driven
  - hypothesis-validation
  - skill-routing
version: "2.1"
---

# Unified Bug Bounty Methodology

## Mission

Orchestrate authorized, evidence-driven security assessments through a coherent understanding of the target, its functionality, and its security boundaries.

Treat the target as a connected application ecosystem rather than a collection of independent requests, endpoints, subdomains, or JavaScript files. Maintain and reuse verified target knowledge, identify meaningful security signals, formulate testable hypotheses, and select the smallest relevant set of testing skills.

Prioritize reproducibility, demonstrated security impact, efficient investigation, accurate attribution, and defensible reporting.

This skill coordinates the assessment workflow. It does not replace vulnerability-specific testing, dedicated validation, severity assessment, or reporting skills.

## 1. Authorization and Scope Gate

Before initiating active testing:

1. Identify the program, the proposed asset, and the applicable authorization source.
2. Resolve the asset against the current scope definition, including exact domains, wildcard semantics, asset types, exclusions, and program-specific conditions.
3. Confirm that the intended test method and potential impact are permitted.
4. Identify applicable rate limits, account requirements, data-handling restrictions, third-party dependencies, and mandatory stop conditions.
5. Resolve any ambiguity before performing the affected test.

Apply scope rules using the program's explicit definitions and the relevant scope resolver. Do not infer authorization from DNS relationships, shared hosting, common ownership, certificates, naming conventions, linked services, or technical connectivity alone.

Distinguish the following states:

- **In scope:** Explicitly eligible under the applicable program rules.
- **Out of scope:** Explicitly excluded or otherwise prohibited.
- **Unresolved:** Insufficient evidence to determine eligibility.
- **Restricted:** Eligible only under specific conditions or limitations.

Do not perform active testing against unresolved, out-of-scope, or conditionally restricted assets until the relevant authorization requirements have been satisfied.

Scope decisions must remain traceable to their source and evaluation time. Re-evaluate them when program rules or asset classifications change.

## 2. Target-Level Knowledge and Context

### 2.1 Establish a coherent target model

Maintain a persistent, target-centered knowledge model that connects related observations across assessment sessions.

Where evidence is available, correlate:

- **Assets:** Root domains, subdomains, IP addresses, services, hosting relationships, and verified ownership.
- **Applications:** Products, environments, application boundaries, tenants, and functional areas.
- **Identity and authorization:** Accounts, roles, sessions, permissions, tenants, object ownership, and trust boundaries.
- **Client-side artifacts:** JavaScript bundles, source maps, libraries, configuration, route definitions, and client-side function references.
- **Application interfaces:** API routes, HTTP methods, parameters, headers, request/response pairs, and state transitions.
- **Backend behavior:** Observable business operations, shared identifiers, authorization decisions, and relationships supported by evidence.
- **Security observations:** Hypotheses, test results, confirmed findings, rejected leads, unresolved questions, and relevant historical evidence.

### 2.2 Correlate observations without fragmenting the target

Do not automatically create a separate target identity for every request, endpoint, subdomain, file, or discovered route.

Instead:

1. Resolve each observation to its existing target, application, component, or functional context where possible.
2. Reuse established component identities when the evidence supports the relationship.
3. Record new components as related entities within the existing target model.
4. Create separate target identities only when the architecture or scope model justifies the distinction.
5. Preserve links between related observations so investigators can navigate from a JavaScript function to a route, from a route to observed requests, and from those requests to relevant authorization behavior.

For example, multiple API requests generated by the same application workflow should be correlated when evidence establishes their relationship. They should not be treated as independent security findings merely because their URLs differ.

### 2.3 Preserve evidence provenance

Every durable observation should retain, where available:

- Target and component identifiers.
- Source artifact or observation reference.
- Timestamp and assessment context.
- Relevant account, role, and application state.
- Observed behavior and associated evidence.
- Confidence and verification status.
- Relationships to existing observations.
- Resulting decision or next action.

Clearly distinguish verified facts, interpretations, assumptions, and hypotheses. Do not silently promote inferred relationships into established facts.

## 3. Evidence-Driven Workflow Selection

The methodology is adaptive, not a mandatory linear checklist. Select the next phase according to the current evidence, unresolved questions, assessment progress, and expected information gain.

### Phase A — Understand

Establish the assessment context:

- Program rules and scope.
- Existing target knowledge and assessment history.
- Application functionality and relevant business workflows.
- Available roles, test accounts, and authorization boundaries.
- Known components, technologies, and unresolved leads.

Reuse existing verified knowledge instead of repeating completed discovery without a specific reason.

### Phase B — Map

Build or refine the target model:

- Discover and correlate authorized assets and application components.
- Identify routes, API operations, JavaScript references, and observable data flows.
- Map relevant identities, object ownership, roles, and trust boundaries.
- Identify shared functionality and potentially reusable investigation paths.

Prioritize mapping that can support a concrete security hypothesis. Exhaustive collection is not a substitute for understanding the application.

### Phase C — Form a Hypothesis

Translate a meaningful signal into a testable security hypothesis.

Determine:

- What security property should the application enforce?
- Which boundary, assumption, or control may be failing?
- What evidence suggests the expected behavior may not hold?
- Which roles, objects, parameters, states, or request paths are relevant?
- What benign explanation could account for the observation?
- What is the smallest test that can distinguish the competing explanations?

Avoid launching broad vulnerability scans or invoking unrelated skills solely because an asset has been discovered.

### Phase D — Test

Select the least-invasive authorized test that can validate or reject the hypothesis.

Establish the expected secure behavior before interpreting the result. Preserve the relevant request, response, identity, object, and application state so that the outcome can be reproduced and attributed correctly.

Prefer controlled comparisons, authorized test accounts, and synthetic data. Avoid unnecessary changes to production data or application state.

### Phase E — Correlate and Chain

When evidence supports a relationship, investigate how relevant components interact across:

- Client-side code and generated requests.
- HTTP requests and responses.
- API routes and observable backend behavior.
- Authentication and authorization boundaries.
- Application state and business workflows.
- Infrastructure and external dependencies.

Do not assume that shared naming, similar responses, common libraries, or neighboring endpoints prove a shared implementation or exploitable relationship.

### Phase F — Validate and Report

For promising leads:

1. Verify asset eligibility.
2. Reproduce the behavior.
3. Confirm the violated security property.
4. Establish the actual or sufficiently supported impact.
5. Evaluate alternative explanations and relevant controls.
6. Determine defensible severity and affected components.
7. Prepare the evidence and handoff required by the reporting workflow.

Return to an earlier phase when new evidence changes the target model or invalidates a prior assumption.

## 4. Hypothesis Management and Test Records

Maintain a structured record for each meaningful investigation lead.

Required fields:

- **Lead ID:** Stable identifier for the investigation.
- **Target context:** Target, application, component, and related observations.
- **Signal:** The original observation and its source.
- **Hypothesis:** The proposed security failure.
- **Security boundary:** The property or control being evaluated.
- **Preconditions:** Relevant account, role, object, permissions, and application state.
- **Test plan:** Minimal authorized steps needed to distinguish the hypothesis.
- **Expected behavior:** The secure behavior anticipated under the tested conditions.
- **Observed behavior:** The actual result, supported by attributable evidence.
- **Outcome:** Confirmed, rejected, inconclusive, or requires further investigation.
- **Confidence:** Evidence-based assessment of the conclusion.
- **Next action:** The smallest useful follow-up, if any.

Do not confuse confidence in an observation with confidence in exploitability or impact. A reproducible response difference may be high-confidence evidence of behavioral variation while providing insufficient evidence of a vulnerability.

Record meaningful negative results and the conditions under which they were obtained. Revisit a rejected hypothesis only when new evidence, changed conditions, or a materially different test premise justifies doing so.

## 5. Validation and False-Positive Controls

A scanner alert, reflected parameter, exposed route, software version, suspicious code pattern, or theoretical attack path is a lead—not a confirmed vulnerability.

Before classifying a lead as a finding, verify the following:

1. **Scope:** The affected asset and tested behavior are authorized.
2. **Reproducibility:** The behavior can be repeated under documented conditions.
3. **Attribution:** The evidence corresponds to the relevant request, response, identity, object, and application state.
4. **Security violation:** A meaningful security property or boundary is actually violated.
5. **Causality:** The observed result is attributable to the proposed weakness rather than an unrelated application behavior.
6. **Alternative explanations:** Relevant benign explanations and existing security controls have been considered.
7. **Impact:** The demonstrated impact is separated from hypothetical consequences.
8. **Severity:** The proposed severity reflects the evidence, prerequisites, affected assets, and realistic impact.
9. **Reproducibility of the report:** Another authorized reviewer can follow the documented steps and understand the conclusion.

Use the following verification states:

- **Lead:** An observation warrants investigation.
- **Hypothesis:** A plausible security failure has been formulated.
- **Under validation:** Evidence is being collected to confirm or reject the hypothesis.
- **Inconclusive:** Current evidence does not establish either conclusion.
- **Rejected:** The tested hypothesis is not supported under the documented conditions.
- **Confirmed:** Sufficient reproducible evidence establishes the security violation and its supported impact.
- **Report-ready:** The finding has passed the required validation and reporting checks.

Do not bypass these states merely to increase the number of findings. Preserve uncertainty explicitly when the evidence is incomplete.

Use authorized test accounts and synthetic data whenever possible. Do not access or retain unrelated users' sensitive information to demonstrate impact. Stop once sufficient evidence has been collected.

## 6. Correlation and Exploit-Chain Validation

A vulnerability chain is valid only when its individual links and the relationship between them are supported by evidence.

For every proposed link, document:

- The prerequisite or initial security condition.
- The observed behavior and its evidence.
- The security boundary affected at that stage.
- The relationship to the next step.
- The contribution to the final impact.
- Any assumptions, limitations, or unverified transitions.

Distinguish between:

- **Related observations:** Components or behaviors that share a documented relationship.
- **Potential chain:** A plausible sequence that still contains unverified links.
- **Validated chain:** A reproducible sequence in which the relevant links and resulting security impact are established.

Do not combine unrelated weaknesses into a single finding solely because they affect the same organization or application.

Where individual issues are independently valid, preserve their separate evidence and assess whether the combined impact warrants an additional chain-level explanation.

## 7. Specialist Skill Routing

This skill owns workflow coordination, hypothesis management, phase selection, target-context correlation, and decisions about which specialist capability is needed.

Route work according to evidence and the specific question that must be answered.

- **Vulnerability-specific skills:** Invoke the relevant skill when a concrete lead warrants investigation, such as IDOR, XSS, SSRF, authentication or authorization failures, injection, file handling, business logic, GraphQL, cloud configuration, or AI security.
- **Security arsenal:** Load `security-arsenal` only when a specific test requires concrete payloads, bypass references, wordlists, or technical pattern references.
- **Validation and triage:** Use the dedicated validation workflow when a lead requires formal verification, impact analysis, false-positive assessment, or submission-readiness checks.
- **Reporting:** Use the reporting skill for final report structure, severity justification, evidence presentation, and submission preparation.
- **Reconnaissance:** Use relevant discovery capabilities when a specific gap in authorized asset or application knowledge blocks the next decision.
- **Target knowledge and learning:** Use the appropriate knowledge-management capabilities to retrieve, correlate, or persist durable observations.

### Routing rules

1. Select the smallest set of skills that can answer the current question.
2. Pass only the relevant target context, evidence, constraints, and expected output.
3. Reuse established knowledge rather than rediscovering the same facts.
4. Invoke additional skills only when new evidence or a concrete dependency justifies them.
5. Preserve evidence and provenance across skill handoffs.
6. Do not invoke every available skill on every target.
7. Do not treat a specialist skill's output as confirmed without the required validation.
8. Avoid duplicate investigations when an existing lead or active task already covers the same hypothesis.

## 8. Reporting Handoff

A report-ready handoff should include:

- Program and verified in-scope asset.
- Applicable program restrictions.
- Concise title and vulnerability classification.
- Affected component and relevant target context.
- Preconditions and required attacker capabilities.
- Exact reproduction steps.
- Sanitized, attributable request/response evidence.
- Expected versus observed behavior.
- Violated security boundary.
- Demonstrated impact and affected parties or resources.
- Severity rationale and supporting evidence.
- Relevant chain links, if applicable.
- Limitations and remaining uncertainty.
- Practical remediation guidance.

Separate observed facts from inferred consequences. Avoid overstating the impact, claiming access that was not demonstrated, or presenting a theoretical chain as a confirmed exploit.

The reporting skill remains responsible for final report formatting and submission-specific requirements.

## 9. Safety, Constraints, and Stop Conditions

Perform testing only within verified authorization and applicable program rules.

Do not proceed with actions that introduce unnecessary risk, including destructive testing, denial of service, persistence, credential abuse, unauthorized account access, or unnecessary interaction with third-party systems.

Stop or reassess when:

- Scope or authorization becomes uncertain.
- A test approaches a prohibited action or program limit.
- Sensitive information belonging to unrelated users is exposed.
- Application integrity or availability may be affected.
- The available evidence already establishes the relevant impact.
- Continuing would add risk without materially improving the conclusion.

Prefer minimal, reversible, and attributable tests. Record the reason for stopping and the remaining uncertainty.

## 10. Learning and Knowledge Persistence

Persist durable observations in the target knowledge or learning layer using the repository's established storage and schema conventions.

Store, where supported:

- Target and component relationships.
- Evidence references and provenance.
- Hypotheses and their outcomes.
- Reproducible behavioral observations.
- Confirmed findings and validation status.
- Meaningful negative results.
- Confidence, timestamps, and relevant conditions.
- Decisions that can prevent redundant work in future sessions.

Maintain a strict separation between:

1. **Target knowledge:** Facts and observations specific to an application or target.
2. **Assessment state:** Current hypotheses, tasks, test progress, and unresolved questions.
3. **Generalized learning:** Reusable patterns supported by repeated or independently verified evidence.
4. **Skill definitions:** Stable procedures, rules, and reusable testing guidance.

Do not modify a general-purpose skill merely because one target exhibits unusual behavior. Promote target-specific observations into generalized guidance only when the evidence supports a repeatable, transferable improvement.

Avoid duplicate records, unsupported conclusions, uncontrolled learning loops, and automatic promotion of unverified hypotheses into reusable rules.

## 11. Completion Criteria

An assessment task is complete when its stated objective has been addressed and the result has been recorded with appropriate evidence and status.

Before closing a task, verify that:

- Scope and authorization were respected.
- Relevant existing target knowledge was reused.
- The selected hypothesis or assessment objective was addressed.
- Results are attributable and accurately classified.
- Confirmed findings have sufficient evidence for their intended handoff.
- Rejected and inconclusive leads retain useful context.
- Durable knowledge has been updated where appropriate.
- The next action, if one remains, is explicit.

Do not equate completion of a scan, skill invocation, or discovery phase with completion of a security assessment.

## Operating Principle

**Understand the target. Follow the evidence. Test the smallest meaningful hypothesis. Validate before reporting. Preserve what is learned.**
