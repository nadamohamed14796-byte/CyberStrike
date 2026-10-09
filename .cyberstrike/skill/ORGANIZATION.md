# Skill Library Organization Contract

## 1. Goals

Organize `.cyberstrike/skill/` so that the runtime can select the smallest relevant skill, researchers can navigate the corpus, and imported knowledge remains traceable. Organization must improve discoverability without breaking runtime lookup, learned skill identifiers, or existing Markdown references.

## 2. Logical layers

These are **logical roles**, not a mandate to move existing files into new physical folders.

### Layer A — Workflow and control
- Canonical methodology: scope/authorization gate, target-level context, prioritization, hypothesis selection, validation, chaining, report handoff.
- Scope/safety rules are hard gates, not optional recommendations.
- Keep the shared workflow in one canonical file. Existing legacy names should be short delegates where compatibility requires them.

### Layer B — Category routers
- Route only when there is a concrete signal, artifact, technology, behavior, or testing phase.
- Give a short list of child skills and explain the conditions for choosing each one.
- A router is not a second copy of all specialist instructions.
- Keep routing evidence-driven: `signal → context confirmed → skill selected → controlled test → evidence/impact → outcome`.

### Layer C — Specialist skills
Each specialist should have a narrow scope and, where applicable:
1. Valid frontmatter and a stable skill identifier.
2. Explicit activation signals and non-signals.
3. Prerequisites, required context, and scope/safety limits.
4. A focused test procedure and expected observations.
5. Baseline/control comparisons and reproducibility requirements.
6. Exploitability/impact validation and false-positive rejection criteria.
7. Related skills and correct relative links.
8. Source/provenance/license details for imported material.

### Layer D — Reference and standards
- Keep catalogs, standards, technique mappings, payload references, and external writeups distinguishable from live target observations.
- Load references on demand; do not inject all catalogs into every agent context.
- A reference, scanner alert, payload match, or historical writeup is not itself a confirmed finding.

### Layer E — Reporting and learning
- Reporting skills define evidence packaging and clear impact statements.
- Learning records outcomes separately from source skill text.
- Outcomes may adjust ranking and future recommendations; they must not rewrite a skill's content or turn an unverified lead into evidence.

## 3. Taxonomy and placement

Use the existing folder hierarchy first. Common topic families include:
- Workflow/methodology: `methodology/`, `meta/`, `adaptive-testing/`
- Recon: `recon/`
- Web/API/protocol: `web/`, `api/`, `graphql/`, `http/`, `websocket/`, `web-cache/`, `request-smuggling/`
- Identity/access: `auth/`, `idor/`, `oauth/`, `jwt/`, `saml/`
- Injection and server-side behavior: `xss/`, `sqli/`, `nosql/`, `ssti/`, `xxe/`, `ssrf/`, `rce/`, `path-traversal/`
- Application workflows/files: `business-logic/`, `file-access-vuln/`, `file-upload/`, `csrf/`, `race-condition/`, `open-redirect/`, `rate-limit/`
- Platforms/infrastructure: `cloud/`, `infra/`, `network/`, `linux/`, `windows/`, `macos/`, `mobile/`, `active-directory/`, `web3/`
- Offensive and specialized research: `redteam/`, `exploit-development/`, `fuzzing/`, `evasion/`, `waf-bypass/`, `waf-evasion/`, `binary-protection-bypass/`
- Standards/reference/reporting: `NIST/`, `CIS_benchmarks/`, `mitre_attack/`, `mitre_attack_ics/`, `reporting/`, `reference-learning/`

This taxonomy is a navigation model, not a complete directory listing. Existing paths with uppercase names, legacy aliases, or specialist files at the root are retained until a full reference/registry migration is proven safe.

## 4. Naming and metadata rules

- Preserve established `name` / skill IDs unless the runtime registry and every reference are migrated together.
- Use a descriptive, stable, lowercase kebab-case name for new skill IDs when compatible with existing conventions.
- A category router should say when it activates, what it routes to, and what evidence selects a child.
- A specialist should not claim to be a router unless it performs routing.
- Keep frontmatter parsable and consistent with the actual skill path and role.
- Prefer relative Markdown links that are correct from the current file's directory.
- When a link points to external material, label it external; do not fabricate local paths to make the audit appear green.
- Avoid duplicated copies of a methodology. Use explicit compatibility delegates when legacy names are referenced.

## 5. Agent context loading rules

1. Start with the methodology/scope gate and existing target-level context.
2. Select one category router only when the signal warrants it.
3. Load the minimum specialist set needed for the current hypothesis.
4. Load large references, payload catalogs, standards, and writeups only on demand.
5. For delegated agents, pass a bounded brief: target/scope constraints, relevant asset relationships, observed evidence, hypothesis, selected skill(s), and required output schema. Do not pass the entire skill corpus by default.
6. Keep the distinction between observed facts, assumptions, hypotheses, and disproven leads.
7. Return evidence and citations/provenance with the agent result; do not accept a bare conclusion as proof.

## 6. Safe cleanup sequence

Do this in order; do not skip directly to moving files:

1. **Inventory** every skill file and frontmatter ID, including nested paths and case-sensitive paths.
2. **Map references** in Markdown, manifests, registry files, code, prompts, tests, and persisted identifiers.
3. **Classify** each document as router, specialist, methodology, reference, template, legacy alias, or non-skill asset.
4. **Detect duplicates** by content and role, not merely by similar names. Record canonical owner and compatibility aliases.
5. **Audit links** by resolving relative paths from the source file's directory; distinguish local links from intentional external links and anchors.
6. **Fix broken links** only after verifying the intended destination. Do not create empty placeholder skills to silence the audit.
7. **Normalize metadata** and add missing cross-links while preserving source attribution and license requirements.
8. **Move/rename only when necessary** and update all links, registry references, tests, and compatibility paths in one change.
9. **Run validation**: skill registry, frontmatter parser, Markdown link resolver, duplicate-ID audit, runtime loading tests, scope gate tests, and relevant package tests.
10. **Publish an audit report** with counts for scanned files, valid links, unresolved links, duplicates, metadata problems, and tests run. Never report a check as passing if it was skipped.

## 7. Definition of done

- The root README provides reliable navigation to workflow and major skill families.
- Every skill has one intended role and a stable identifier.
- Shared workflow logic has one canonical source.
- Links resolve or are explicitly marked external/intentional legacy references.
- Registry discovery and runtime loading still work with the existing paths.
- No source skills are deleted or renamed without a verified migration plan.
- Tests and audits report real results, including remaining failures.
