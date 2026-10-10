# `.cyberstrike/skill/` Structural Audit

Scope: 8,056 `SKILL.md` files (+27 miscapitalized `skill.md`, +others) under `.cyberstrike/skill/`. Scripted, schema-level audit — not a per-file narrative review (see `.audit/PHASE0_INVENTORY.md` for why).

Method: `/tmp/.../scratchpad/audit_skills.py` — parses YAML frontmatter, checks required fields, duplicate `name:` values, `chains_with` references resolving to an existing `name:`, and `files:` references resolving on disk. Raw output: `skill_audit_results.json` (not committed — reproducible from the script + repo).

## Finding 1 (Major) — Two incompatible skill-file schemas coexist, and the old one is invisible to the frontmatter-based router

25 files (e.g. `oauth/offensive-oauth/SKILL.md`, `rce/offensive-rce/SKILL.md`, `fuzzing/offensive-fuzzing-course/SKILL.md`, full list below) use a **legacy prose format** — `# SKILL: <title>` / `## Metadata` / `- **Skill Name**: <name>` — with **no YAML frontmatter at all**. Every other skill file in the corpus uses YAML frontmatter (`name:`, `description:`, `category:`, `chains_with:`, `files:`).

Consequence: any tool that indexes skills by parsing frontmatter `name:` (which is how the router skills' own `chains_with:` lists work, and presumably how `.cyberstrike`'s runtime loader resolves skills) will never see these 25 skills exist. Their router entries become silent dead links — e.g. `oauth/oauth-sec/SKILL.md` lists `chains_with: [offensive-oauth, ...]`, but `offensive-oauth` never registers a `name: offensive-oauth` anywhere, so that route resolves to nothing at runtime even though the file and content are present on disk.

Affected legacy-format files (25 of 29 "no frontmatter" hits; 4 others are a different ad hoc format, see Finding 1b):
```
oauth/offensive-oauth/SKILL.md
offensive-ai-security/SKILL.md
offensive-crash-analysis/SKILL.md
offensive-initial-access/SKILL.md
offensive-basic-exploitation/SKILL.md
offensive-keylogger-arch/SKILL.md
fuzzing/offensive-fuzzing-course/SKILL.md
file-upload/offensive-file-upload/SKILL.md
rce/offensive-rce/SKILL.md
open-redirect/offensive-open-redirect/SKILL.md
offensive-mitigations/SKILL.md
offensive-fast-checking/SKILL.md
race-condition/offensive-race-condition/SKILL.md
offensive-bug-identification/SKILL.md
offensive-vuln-classes/SKILL.md
request-smuggling/offensive-request-smuggling/SKILL.md
... (+9 more of the same pattern; full paths in skill_audit_results.json → missing_frontmatter)
```

**Suggested fix:** add YAML frontmatter (`name`, `description`, `category`, `chains_with`, `files`) to these 25 files, matching the `name:` each router already expects (e.g. `name: offensive-oauth` for `oauth/offensive-oauth/SKILL.md`), OR — if frontmatter-less files are intentionally a different, standalone skill tier — document that convention and stop referencing them from `chains_with` in frontmatter-based routers.

### Finding 1b (Minor) — 4 files use a third, undocumented format
`xss/WEB/xss-modern-browser/SKILL.md`, `xss/WEB/advanced-xss/SKILL.md`, `xss/WEB/xss-ai-application/SKILL.md`, `xss/WEB/xss-realtime-protocols/SKILL.md` open directly with `# <Title>` and prose, no `## Metadata` block and no frontmatter. Same routing-invisibility consequence as Finding 1, but these aren't even referenced by any `chains_with` in the current corpus, so they're orphaned content rather than broken links — lower severity, same root cause (inconsistent schema).

## Finding 2 (Major) — `adaptive-testing` category: `chains_with` uses unprefixed names, but `name:` fields are prefixed

All 6 skills under `.cyberstrike/skill/adaptive-testing/` cross-reference each other via folder-name-shaped identifiers in `chains_with` (`failure-analysis`, `mutation-policy`, `response-differential`, `technique-matcher`), but their own declared `name:` fields are prefixed differently:

| Folder | Declared `name:` | Referenced as (in sibling `chains_with`) |
|---|---|---|
| `failure-analysis/` | `adaptive-failure-analysis` | `failure-analysis` |
| `mutation-policy/` | `adaptive-mutation-policy` | `mutation-policy` |
| `response-differential/` | `adaptive-response-differential` | `response-differential` |
| `technique-matcher/` | `adaptive-technique-matcher` | `technique-matcher` |
| `transformation-analysis/` | `transformation-analysis` | matches (this one's fine) |

Every `chains_with` edge in this category (16 edges across 6 files) is dangling — the whole adaptive-testing routing cluster is disconnected. **Suggested fix:** pick one convention (prefixed or not) and make `name:` and `chains_with` agree; prefixed (`adaptive-*`) matches 4 of 6 files, so that's the smaller edit.

## Finding 3 (Minor) — 27 files named `skill.md` (lowercase) instead of `SKILL.md`

All 27 are under `.cyberstrike/skill/CIS_benchmarks/Operating_Systems/Ubuntu/cis-ubuntu-linux-16-04-lts-benchmark-v2/`. On a case-sensitive filesystem (Linux — what this agent runs on), a loader that globs for `SKILL.md` will silently skip all 27. Likely a leftover from an older CIS-benchmark import batch (the 18-04 and 20-04 benchmark versions in the same tree correctly use `SKILL.md`). **Suggested fix:** rename to `SKILL.md` (mechanical, same commit for all 27, no content change) — batched as a Minor cleanup per the audit brief's own rule about not folding it into unrelated fixes.

## Finding 4 (Minor) — `chains_with` is overloaded with two unrelated meanings

In routing skills (e.g. `oauth-sec`, `xss-sec`) `chains_with` lists other *skill names* meant for agent routing. In the NIST/MITRE/CIS compliance trees, the same field lists *control/technique IDs from the external standard* (e.g. `PE-3(5)` → `chains_with: [SA-16, SR-9, SR-11]`), most of which were never imported as skill files in this corpus — that's expected (a partial compliance mapping), not a bug. This produced 6,981 of the raw 7,219 "dangling reference" hits from the naive check — i.e. 97% of the raw dangling count is this expected pattern, not a defect. Flagging only because the same field name carrying two different semantics (routing edge vs. documentation citation) is a readability/maintainability smell, not something to "fix" by deleting the compliance cross-refs.

## Finding 5 — No duplicate `name:` values, no broken `files:` references
Checked across all 8,056 parseable files: 0 duplicate skill names, 0 `files:` entries pointing at a nonexistent path. Clean on both counts.

## Summary table

| # | Finding | Severity | Files affected | Fix type |
|---|---|---|---|---|
| 1 | Legacy no-frontmatter skills invisible to router | Major | 25 | Add frontmatter |
| 1b | Orphaned undocumented-format skills | Minor | 4 | Add frontmatter or document tier |
| 2 | `adaptive-testing` name/chains_with mismatch | Major | 6 (16 broken edges) | Rename `name:` fields |
| 3 | Lowercase `skill.md` filenames | Minor | 27 | Rename files |
| 4 | `chains_with` semantic overload (compliance vs. routing) | Minor (note only) | ~6,981 refs, no action needed | None required |
| 5 | Duplicate names / bad `files:` refs | — | 0 | n/a — clean |

**Net: 62 distinct files need an actual content/name fix** (25 for Finding 1 + 4 for Finding 1b + 6 for Finding 2 + 27 for Finding 3, no overlap between the groups). This will be executed as Phase 5 fixes (one commit for Finding 1/1b, one for Finding 2, one Minor cleanup commit for Finding 3), after Phase 1/2 on `packages/` so all fixes land together with full traceability.
