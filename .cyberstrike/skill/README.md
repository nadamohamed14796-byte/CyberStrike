# CyberStrike Skill Library

## Overview

The CyberStrike Skill Library is a version-controlled knowledge repository used by CyberStrike's skill discovery, routing, assessment, and learning workflows.

It contains several complementary types of resources:

- **Routing skills** that map assessment signals to relevant capabilities.
- **Specialist skills** that provide focused, task-specific testing guidance.
- **Methodology skills** that coordinate workflows, decision-making, and evidence validation.
- **Reference materials** that support technical research and hypothesis development.
- **Validation and reporting resources** that help establish findings and prepare defensible reports.
- **Learning resources** that preserve assessment outcomes and improve future decisions.

The library is not a flat collection of independent documents. Directory structure, skill frontmatter, identifiers, cross-references, and runtime integration may all affect how skills are discovered and used.

## Getting Started

Follow this sequence when working with the library.

1. **Establish the assessment workflow.** Start with [`methodology/SKILL.md`](./methodology/SKILL.md) for authorized assessment planning, target-level context, hypothesis selection, validation, and reporting handoffs.

2. **Identify the appropriate category router.** When one exists, use the relevant router to identify the smallest set of specialist skills needed. Examples include [`api/api-sec/SKILL.md`](./api/api-sec/SKILL.md), [`recon/recon-sec/SKILL.md`](./recon/recon-sec/SKILL.md), [`web/web-sec/SKILL.md`](./web/web-sec/SKILL.md), and [`auth/auth-sec/SKILL.md`](./auth/auth-sec/SKILL.md).

3. **Load only relevant specialist skills.** Follow verified references from the selected router and match each skill to the observed behavior, applicable technology, and current hypothesis. Avoid loading the entire library into every agent's context.

4. **Validate before reporting.** Apply the methodology's evidence and false-positive controls. Use the appropriate validation, triage, and reporting resources before classifying a lead as report-ready.

5. **Preserve assessment outcomes.** Consult [`reference-learning/SKILL.md`](./reference-learning/SKILL.md) for guidance on recording results, retaining provenance, and improving future routing without silently modifying version-controlled skill definitions.

## Navigation by Purpose

The following index provides representative entry points. It is a navigation aid, not an exhaustive inventory of the repository.

| Purpose | Entry points and examples | Intended use |
|---|---|---|
| Workflow and methodology | [`methodology`](./methodology/SKILL.md), [`meta/meta-sec`](./meta/meta-sec/SKILL.md), [`adaptive-testing`](./adaptive-testing/) | Assessment planning, prioritization, workflow decisions, and skill selection |
| Reconnaissance and asset discovery | [`recon`](./recon/) | Scope-aware discovery, attack-surface mapping, and reconnaissance |
| Web applications and APIs | [`web`](./web/), [`api`](./api/), [`graphql`](./graphql/) | Web application behavior, APIs, GraphQL, routes, parameters, and data flows |
| Identity and access control | [`auth`](./auth/), [`idor`](./idor/), [`oauth`](./oauth/), [`jwt`](./jwt/), [`saml`](./saml/) | Authentication, sessions, tokens, object-level authorization, and function-level authorization |
| Injection and input handling | [`xss`](./xss/), [`sqli`](./sqli/), [`nosql`](./nosql/), [`ssti`](./ssti/), [`xxe`](./xxe/), [`ssrf`](./ssrf/), [`rce`](./rce/) | Evidence-driven investigation of input handling and injection-related weaknesses |
| HTTP and browser security | [`http`](./http/), [`csrf`](./csrf/), [`web-cache`](./web-cache/), [`websocket`](./websocket/), [`request-smuggling`](./request-smuggling/) | Protocol behavior, browser security, caching, cross-origin controls, and request parsing |
| Files and business logic | [`file-access-vuln`](./file-access-vuln/), [`file-upload`](./file-upload/), [`path-traversal`](./path-traversal/), [`business-logic`](./business-logic/), [`race-condition`](./race-condition/) | File access, upload handling, workflow integrity, state transitions, and concurrency |
| Infrastructure and platforms | [`network`](./network/), [`linux`](./linux/), [`windows`](./windows/), [`cloud`](./cloud/), [`infra`](./infra/), [`mobile`](./mobile/), [`web3`](./web3/) | Platform-specific assessment and infrastructure security |
| Specialized security research | [`redteam`](./redteam/), [`exploit-development`](./exploit-development/), [`waf-evasion`](./waf-evasion/), [`waf-bypass`](./waf-bypass/), [`security-arsenal`](./methodology/security-arsenal/SKILL.md) | Specialized technical references and testing guidance, subject to authorization and applicability |
| Governance and reporting | [`NIST`](./NIST/), [`CIS_benchmarks`](./CIS_benchmarks/), [`mitre_attack`](./mitre_attack/), [`reporting`](./reporting/) | Security standards, technique taxonomies, assessment controls, and reporting |
| Learning and provenance | [`reference-learning`](./reference-learning/SKILL.md) | Outcome tracking, evidence provenance, and controlled improvements to routing |

**Repository discovery:** Use repository search and the active skill registry to determine the complete set of available skills. Not every topic has a category router, and the examples above should not be interpreted as proof that every referenced path exists in every repository revision.

## Directory and Skill Conventions

### 1. Category routers

A category router is a lightweight entry point that maps observed signals, assessment requirements, and technical context to relevant specialist skills.

Where established by the repository, prefer the convention:

`<topic>/<topic>-sec/SKILL.md`

Routers should identify selection criteria and prerequisites rather than duplicate the complete procedures of every specialist skill.

### 2. Specialist skills

A specialist skill addresses a focused vulnerability class, technology, or assessment task.

Where applicable, it should define:

- Purpose and activation criteria.
- Prerequisites and authorization constraints.
- Required context and evidence.
- A focused testing or analysis procedure.
- Validation criteria and false-positive controls.
- Impact boundaries and stop conditions.
- Related skills and reporting handoffs.

Specialist skills should remain focused and reusable. Cross-cutting workflow logic belongs in the canonical methodology or another appropriate shared component.

### 3. Methodology skills

Methodology skills define shared assessment workflows, prioritization rules, hypothesis management, and decision logic.

Maintain one canonical source for each shared workflow. Compatibility entry points should delegate to that source where supported by the runtime rather than maintain divergent copies of the same methodology.

### 4. Reference and catalog skills

Reference resources provide reusable background knowledge, technical patterns, and research material.

They can inform hypotheses and help identify relevant tests, but they are not evidence that a vulnerability exists in a particular target.

A reference becomes relevant to a finding only when the target's observed behavior independently supports the conclusion.

### 5. Runtime learning and assessment state

Runtime learning stores assessment outcomes, evidence references, confidence, and other supported signals used to improve future decisions.

Keep the following logically separate:

- **Versioned skill definitions:** Reviewed, reusable procedures and rules.
- **Target knowledge:** Correlated facts and observations about a particular application or asset.
- **Assessment state:** Active hypotheses, tasks, test results, and unresolved questions.
- **Learning records:** Outcomes and generalized signals used to improve future routing.

Learning systems must not silently rewrite source skills or promote unverified hypotheses into authoritative testing guidance.

## Authoring and Maintenance Principles

### Preserve compatibility

Skill paths, frontmatter fields, identifiers, and cross-references may be consumed by runtime components and external tooling.

Before changing them, determine which parts of the repository depend on the existing structure.

### Prefer evidence-driven routing

Select skills according to the current hypothesis, observed behavior, relevant technology, and missing evidence.

Do not load every skill in a category simply because a target uses that technology.

### Maintain traceability

Preserve the source and context of observations, validation results, and learning signals. Distinguish target-specific findings from reusable technical knowledge.

### Validate changes

Where supported by the repository's tooling, validate:

- Frontmatter syntax and required metadata.
- Skill identifiers and registry mappings.
- Local Markdown links and referenced files.
- Router-to-specialist relationships.
- Loader and runtime compatibility.
- Duplicate or conflicting workflow definitions.
- Changes to discovery and routing behavior.

A successful syntax check does not, by itself, prove that a skill is correctly registered, discoverable, or executable by the runtime.

## Non-Destructive Organization Policy

This library contains interconnected documents, imported references, legacy paths, and potentially runtime-sensitive metadata.

**Do not bulk-move, rename, or delete skills solely to make the directory tree more uniform.**

Before reorganizing the library:

1. Inventory the current files, directories, and skill identifiers.
2. Map inbound and outbound Markdown references.
3. Inspect registry entries, loader rules, runtime triggers, and compatibility paths.
4. Identify duplicate content separately from intentionally distinct skills.
5. Design a compatibility-preserving migration.
6. Apply changes in small, reviewable increments.
7. Run available link, metadata, registry, and integration checks.
8. Review unresolved references and runtime-impacting changes before merging.

Preserve unusual capitalization, legacy paths, and compatibility entry points until their dependencies have been verified. Do not mark missing links as repaired merely because their errors have been downgraded to warnings.

See [`ORGANIZATION.md`](./ORGANIZATION.md) for the library taxonomy, skill-authoring contract, and recommended cleanup sequence.

## Source of Truth

Use the repository's actual files, current skill registry, and runtime configuration to determine which skills exist and how they are loaded.

This README describes the intended organization and navigation model. It does not guarantee that every listed path exists, that every router is registered, or that every documented behavior is enforced by the current runtime.

Changes to the library should preserve the distinction between documented intent, implemented behavior, and verified runtime behavior.
