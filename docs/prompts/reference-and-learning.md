# Prompt: Audit and wire skill references and the learning loop

Use this prompt in CyberStrike (or any agent working in this repo) to check that the
skill set, its references, and the learning briefing are real, connected, and tested.
It audits and repairs. It does not redesign the project and does not start a new
parallel system.

## Goal

Make the chain below true, and prove each link with a file, a runtime path, or a test:

```
filesystem SKILL.md -> skill registry -> trigger router -> agent prompt -> execution
        -> finding / false positive -> learning sync -> briefing -> next engagement
```

## Non-negotiable rules

1. Scope first. Do not run any active request against a target while doing this work.
   Only read files, run tests, and fetch public learning sources.
2. Do not delete functionality to make the audit pass. Rename, move, or merge only
   when equivalence is shown. Keep old names as aliases if anything still references them.
3. Learning never edits SKILL.md. Skills are static knowledge; learning is dynamic
   intelligence kept in the learning store and the briefing file.
4. Redact secrets in every file you write. Keep only the first 4 and last 4 characters.
5. Do not claim a link works unless you traced it through code and ran a test that
   exercises it. A file existing on disk is not enough.
6. Prefer small, verified commits. Run the test suite after each meaningful change.

## Phase 1: Skill inventory

List every `SKILL.md` under the skill directories (`.cyberstrike/skill/`, and any
`skill/` folder under `packages/cyberstrike/src/`). For each one record:

| Skill | Path | Frontmatter name matches dir? | Category | Triggers (signals) | Dependencies exist? | Status |
|-------|------|-------------------------------|----------|--------------------|---------------------|--------|

Checks:
- name is kebab-case, one canonical name, directory name equals frontmatter name
- frontmatter parses as YAML and has `name` and `description`
- no vague names (`misc`, `helpers`, `web`, `security`, `test`, `stuff`)
- near-duplicates (same capability under two names) are listed, not deleted
- every listed dependency points to a skill that exists

Status values: PASS, REVIEW (valid but unclear), FIX (broken metadata or path).

## Phase 2: Reference integrity

For every rename or move, search the whole repo for the old name and old path:
registry entries, trigger lists, agent mappings, prompts (`*.txt`), tests, docs, and
config. Report each hit and fix it. Zero broken references is the pass condition.

## Phase 3: Registry and router consistency

Confirm each direction:
- every registry entry points to a file that exists (filesystem -> registry)
- every `SKILL.md` on disk is either registered or listed as an intentional orphan
- every trigger a skill advertises is emitted by some signal, otherwise the skill is
  unreachable (orphan) and must be reported
- a test covers the router for at least: WAF signal, GraphQL, JWT, object identifier
  (IDOR), redirect parameter, source map

## Phase 4: Learning loop wiring

Trace the learning path end to end and mark each arrow as connected or broken:

1. `learning/sync.ts` fetches the configured public sources into the cache outside
   the project (`~/.cyberstrike/learning/sources` or `CYBERSTRIKE_LEARNING_DIR`).
2. `learning/index.ts` classifies writeups, dedupes them, and builds the index.
3. `briefing(...)` writes `.cyberstrike/agent-briefing.md`, combining the writeup
   index with the user's own accepted findings (`findings/*.md`) and false positives
   (`fp.md`).
4. The engagement start reads that briefing before testing. Confirm this with a grep
   of the prompt that loads it, not by assumption.
5. The false-positive lookup (`finding/fp.ts`, `finding/lifecycle.ts` fingerprint)
   is consulted before a lead is re-investigated. If it is not consulted anywhere in
   the runtime path, say so and mark the arrow broken.

Also check the classifier. Keyword matching is approximate. Report the class counts
and list any class that looks wrong (for example XSS matched on too many writeups)
without silently retuning it.

## Phase 5: Source list

Verify each source in `learning/sync.ts` `SOURCES` is reachable with
`git ls-remote <url>`. Report unreachable ones. Do not add a source unless it is a
public git repository with real writeups. Note any source that is only a link list.

## Phase 6: Tests

Run from `packages/cyberstrike`, never from the repo root:

```
bun test test/learning test/finding test/agent
```

Report exact counts (pass, fail, expect calls). Fix failing tests by fixing the code
or the wrong expectation, and say which one you changed and why.

## Phase 7: Final report

Produce exactly this block, filled with real numbers:

```
TOTAL SKILLS:
VALID (PASS):
REVIEW:
FIX:
MISNAMED:
MISCLASSIFIED:
DUPLICATES (listed, not deleted):
ORPHANS:
BROKEN REFERENCES FIXED:
EXTERNAL SOURCES REACHABLE / TOTAL:
LEARNING CHAIN ARROWS CONNECTED / TOTAL:
TESTS: pass / fail / expect calls
REMAINING (honest list):
```

Then a short table: component | implemented | tested | runtime-connected | persistent | remaining.

Do not write "complete" anywhere in the report unless every REMAINING line is empty and
every arrow in Phase 4 is connected.
