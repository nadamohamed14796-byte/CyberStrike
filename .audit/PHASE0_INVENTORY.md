# Phase 0 — Full Repository Inventory

Generated: 2026-10-10 · Commit: a2574fa (shallow clone of `main`) · Branch: `audit/full-repo-audit-2026-10-10`

## Totals

- **Files (excluding `.git`):** 11,432
- **Directories (excluding `.git`):** 8,676 (close to the ~11,504/~8,682 reference figures in the audit brief; exact match not expected since the live repo has moved since that estimate was written)

## File counts by top-level directory

| Directory | Files | Notes |
|---|---:|---|
| `.cyberstrike/` | 8,156 | **Not application source.** This is CyberStrike's own skill/knowledge library — 8,126 `SKILL.md` files organized under `.cyberstrike/skill/<category>/<skill-name>/SKILL.md`, each a short YAML-frontmatter + markdown routing doc for the agent's offensive-security skill system. Near-templated structure (frontmatter: name/description/category/tags/chains_with/files, then a short "Routing" + "Evidence gate" body). |
| `packages/` | 3,010 | **The actual monorepo source.** 17 sub-packages: `app`, `console`, `containers`, `cyberstrike`, `enterprise`, `extensions`, `function`, `hackbrowser`, `identity`, `plugin`, `script`, `sdk`, `slack`, `ui`, `util` (+2 more — see breakdown below). Real `.ts`/`.tsx` logic: ~1,122 files. `ui/` alone is 1,451 files, dominated by SVG icon assets. |
| `.github/` | 31 | Workflows, issue/PR templates, CI config |
| `hunting-new/` | 145 | Needs Phase 1 classification — not yet inspected |
| `sdks/` | 12 | VS Code SDK per the brief's `sdks/vscode/` path |
| `script/` | 14 | Root-level build/release scripts |
| `assets/`, `docs/`, `github/`, `infra/`, `nix/` | 5/5/9/5/5 | Small, static |
| `patches/` | 3 | Includes `square-logos.patch` content (one of the 3) |
| `.vscode/`, `.husky/`, `.signpath/`, `.claude/`, `specs/` | 2/1/1/1/1 | Config/policy only |
| Root-level loose files | 25 | `package.json`, `turbo.json`, `tsconfig.json`, `bunfig.toml`, `sst.config.ts`, `sst-env.d.ts`, `flake.nix`/`flake.lock`, `bun.lock`, `install`, `square-logos.patch`, `LICENSE`, and the `*.md` docs (`AGENTS.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `IMPLEMENTATION_STATUS.md`, `OPERATIONS.md`, `SECURITY.md`, `STATS.md`, `TROUBLESHOOTING.md`) |

No `node_modules/` present (good — not inflating the count).

## File counts by extension (whole repo)

| Ext | Count | Primarily in |
|---|---:|---|
| `.md` | 8,165 | 8,126 in `.cyberstrike/skill/`; 17 in `packages/`; rest at root/docs |
| `.svg` | 1,209 | `packages/ui/` icon set |
| `.ts` | 1,004 | `packages/` |
| `.tsx` | 272 | `packages/` (console, ui, app) |
| `.json` | 171 | config + data |
| `.css` | 100 | `packages/ui/` |
| `.txt` | 96 | mixed (some under `.cyberstrike`) |
| `.sql` | 92 | likely `packages/cyberstrike` or `console` migrations |
| `.png` | 58 | assets |
| `.py` | 48 | scripts/tooling |
| `.aac`, `.woff2`, `.otf`, `.ttf` | 45/40/7/4 | fonts/audio assets |
| `.yml`/`.yaml` | 36 | CI + config |
| `.html`, `.js`, `.mjs`, `.sh`, `.toml`, `.patch`, `.nix`, `.lock` | ≤14 each | misc |
| no extension | 15 | e.g. `install`, `.editorconfig`-style dotfiles |

## Scoping call (flagged for the user, not decided unilaterally)

The brief's Phase 2 wants a bugs/logic row **per file**. Applied literally to all 11,432 files, **71% of that total (8,126 files) is the `.cyberstrike/skill/` content library** — short, near-identical markdown routing stubs, not executable logic. A per-file "off-by-one / unhandled promise / missing await" logic review doesn't apply to them; the meaningful QA for that corpus is schema/consistency validation (frontmatter completeness, broken `chains_with` references, duplicate skill names, dangling `files:` references) done as a batch, not 8,126 individual bug rows.

**Proposed split (pending your confirmation):**
1. **`packages/` (3,010 files, ~1,122 of them real `.ts`/`.tsx` logic)** — full Phase 2 file-by-file treatment as specified: purpose, exports, relations, logic trace, bugs.
2. **`.cyberstrike/skill/` (8,126 `SKILL.md` files)** — automated structural audit (frontmatter schema, broken cross-references, orphaned `chains_with` targets, duplicate names) across the whole set, reported as an issue table, not 8,126 narrative rows.
3. **Everything else (296 files: `.github/`, `hunting-new/`, `sdks/`, `script/`, `assets/`, `docs/`, `infra/`, `nix/`, `patches/`, `specs/`, root configs)** — full Phase 2 file-by-file treatment.

This still leaves ~3,306 files for genuine per-file narrative rows, which will be worked in bounded batches (one package at a time) across multiple passes, per the brief's own large-repo checkpoint protocol — not attempted in one response.

## Checklist

Full per-file list persisted at [`.audit/phase0_file_checklist.tsv`](./phase0_file_checklist.tsv) (status column: `not_reviewed` / `reviewed`), 11,432 rows, committed to this branch so progress survives across sessions.

**Reviewed so far: 0 / 11,432.**
