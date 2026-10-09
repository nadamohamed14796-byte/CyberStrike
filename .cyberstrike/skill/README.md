# CyberStrike Skill Library

This directory is the versioned knowledge library used by CyberStrike's skill router. It contains **routing skills**, **focused specialist skills**, **methodologies**, **reference material**, and **learning/reporting support**. It is not one flat collection: the folder names and each skill's frontmatter are part of how skills are discovered and linked.

## Start here

1. **Choose the workflow** — use [methodology/SKILL.md](./methodology/SKILL.md) for authorized bug-bounty workflow, target-level context, hypothesis selection, validation, and reporting handoff.
2. **Choose a router** — use the relevant category router before loading a specialist skill. Examples: [api/api-sec/SKILL.md](./api/api-sec/SKILL.md), [recon/recon-sec/SKILL.md](./recon/recon-sec/SKILL.md), [web/web-sec/SKILL.md](./web/web-sec/SKILL.md), [auth/auth-sec/SKILL.md](./auth/auth-sec/SKILL.md), [cloud/cloud-sec/SKILL.md](./cloud/cloud-sec/SKILL.md) when present.
3. **Load only the specialist needed** — follow links from the router and match the skill to observed evidence, technology, and the current hypothesis. Do not load the whole library into every agent's context.
4. **Validate before reporting** — use the methodology's evidence/false-positive gate and the reporting skill where applicable.
5. **Feed back outcomes** — [reference-learning/SKILL.md](./reference-learning/SKILL.md) explains how to learn from outcomes without mutating source skill definitions.

## Navigation by purpose

| Purpose | Existing entry points / examples | Use for |
|---|---|---|
| Workflow and methodology | [methodology](./methodology/SKILL.md), [meta/meta-sec](./meta/meta-sec/SKILL.md), [adaptive-testing](./adaptive-testing/) | Planning, prioritization, routing, test selection |
| Recon and asset discovery | [recon](./recon/) | Scope-aware discovery, attack-surface mapping, recon methods |
| Web and API | [web](./web/), [api](./api/), [graphql](./graphql/) | Web apps, APIs, GraphQL, endpoint and parameter behavior |
| Identity and access control | [auth](./auth/), [idor](./idor/), [oauth](./oauth/), [jwt](./jwt/), [saml](./saml/) | Authentication, sessions, tokens, object/function authorization |
| Injection and input handling | [xss](./xss/), [sqli](./sqli/), [nosql](./nosql/), [ssti](./ssti/), [xxe](./xxe/), [ssrf](./ssrf/), [rce](./rce/) | Evidence-led specialist testing for input-driven behavior |
| HTTP and browser controls | [http](./http/), [csrf](./csrf/), [web-cache](./web-cache/), [websocket](./websocket/), [request-smuggling](./request-smuggling/) | Protocol, browser, cache, cross-origin, and request parsing boundaries |
| Files and business logic | [file-access-vuln](./file-access-vuln/), [file-upload](./file-upload/), [path-traversal](./path-traversal/), [business-logic](./business-logic/), [race-condition](./race-condition/) | File handling, workflows, state transitions, concurrency |
| Infrastructure and platforms | [network](./network/), [linux](./linux/), [windows](./windows/), [cloud](./cloud/), [infra](./infra/), [mobile](./mobile/), [web3](./web3/) | Platform-specific assessments and environment boundaries |
| Offensive/security research references | [redteam](./redteam/), [exploit-development](./exploit-development/), [waf-evasion](./waf-evasion/), [waf-bypass](./waf-bypass/), [security-arsenal](./methodology/security-arsenal/SKILL.md) | Specialized reference material; activate only when applicable and authorized |
| Governance, standards, and reporting | [NIST](./NIST/), [CIS_benchmarks](./CIS_benchmarks/), [mitre_attack](./mitre_attack/), [reporting](./reporting/) | Standards, technique taxonomies, evidence and report structure |
| Learning and provenance | [reference-learning](./reference-learning/SKILL.md) | Record outcomes, preserve provenance, improve routing without rewriting source skills |

The table is a navigation aid, not an exhaustive inventory. Use repository search and the skill registry for the complete live set; not every topic has a category router.

## Directory conventions

- **Category router**: a short entry point that maps signals to a small number of deeper skills. Prefer names like `<topic>/<topic>-sec/SKILL.md` where that convention already exists.
- **Specialist skill**: one focused technique, technology, or assessment task with explicit triggers, prerequisites, procedure, validation, impact boundaries, and related skills.
- **Methodology skill**: cross-cutting workflow or decision logic. Keep one canonical source for shared methodology; compatibility entry points should delegate rather than copy the same workflow.
- **Reference/catalog skill**: reusable background material or patterns. It informs hypotheses but is not target evidence and must not be treated as proof.
- **Runtime learning**: stored outcomes may affect future ranking and routing; they must not silently rewrite versioned skill content.

## Non-destructive organization policy

This library contains many cross-linked documents and imported references. **Do not bulk-move, rename, or delete skills just to make the tree look uniform.** First map every inbound/outbound Markdown link, registry identifier, loader rule, and runtime trigger; then make a compatibility-preserving migration with automated link checks. Preserve unusual capitalization and legacy paths until references are verified.

See [ORGANIZATION.md](./ORGANIZATION.md) for the taxonomy, authoring contract, and cleanup sequence.
