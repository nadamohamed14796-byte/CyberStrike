# Phase 0 — Repository Inventory (reconciled branch snapshot)

- Repository: `https://github.com/nadamohamed14796-byte/CyberStrike`
- Branch: `audit/full-repo-audit-2026-10-10`
- Recursive Git tree SHA: `66af27305c0a33f604c49eb18bf784d0126194c4` (`truncated = false`); snapshot date: 2026-10-10 UTC.
- The inventory includes `.audit/PHASE2_BATCH02_learning_hunting_tests.md`, the one new batch document to be committed with this refresh. Counts below are for that resulting snapshot; other paths are taken directly from the recursive Git tree.
- Tracked paths only; untracked working-directory files and Git internals are not included.

## Exact coverage counts

- Tracked files: **11518**
- Directories: **8684**
- Tree entries after adding the Phase 2 document: **20202**
- Files with individual Phase 2 rows: **29**
- Explicitly not reviewed: **11489**
- Coverage is **partial**. Inventory inclusion does not count as file review; a file is reviewed only when an individual row exists in a Phase 2 batch.

## File counts by top-level directory and extension

| Top-level path | Files | Extension counts |
|---|---:|---|
| `.cyberstrike` | 8156 | .md=8126; .txt=12; .py=8; .json=4; .sh=2; .gitignore=1; .gz=1; .jsonc=1; .ts=1 |
| `packages` | 3083 | .svg=1213; .ts=855; .tsx=272; .json=153; .css=100; .sql=92; .txt=84; .png=82; .woff2=66; .aac=45; .py=38; .md=17; .html=11; .gitignore=10; .ico=8; .otf=7; (no extension)=7; .js=4; .ttf=4; .webmanifest=4; .toml=3; .mjs=2; .mp4=2; .zip=2; .example=1; .lock=1 |
| `hunting-new` | 147 | .ts=131; .yaml=6; .md=5; .json=3; .py=2 |
| `.github` | 31 | .yml=28; .md=1; .td=1; (no extension)=1 |
| `(root)` | 25 | .md=10; .json=3; .lock=2; .ts=2; (no extension)=2; .editorconfig=1; .gitignore=1; .nix=1; .patch=1; .prettierignore=1; .toml=1 |
| `sdks` | 15 | .json=2; .mjs=2; .svg=2; .ts=2; (no extension)=2; .gitignore=1; .js=1; .lock=1; .png=1; .vscodeignore=1 |
| `script` | 14 | .ts=11; (no extension)=2; .sh=1 |
| `.audit` | 9 | .md=6; .json=1; .py=1; .tsv=1 |
| `github` | 9 | .json=2; .ts=2; (no extension)=2; .gitignore=1; .lock=1; .yml=1 |
| `assets` | 5 | .svg=2; .webp=2; .png=1 |
| `docs` | 5 | .md=5 |
| `infra` | 5 | .ts=5 |
| `nix` | 5 | .nix=2; .ts=2; .json=1 |
| `patches` | 3 | .patch=3 |
| `.vscode` | 2 | .json=2 |
| `.claude` | 1 | .json=1 |
| `.husky` | 1 | (no extension)=1 |
| `.signpath` | 1 | .yml=1 |
| `specs` | 1 | .md=1 |

## Whole-repository extension totals

| Extension | Files |
|---|---:|
| `.md` | 8171 |
| `.svg` | 1217 |
| `.ts` | 1011 |
| `.tsx` | 272 |
| `.json` | 172 |
| `.css` | 100 |
| `.txt` | 96 |
| `.sql` | 92 |
| `.png` | 84 |
| `.woff2` | 66 |
| `.py` | 49 |
| `.aac` | 45 |
| `.yml` | 30 |
| `(no extension)` | 17 |
| `.gitignore` | 14 |
| `.html` | 11 |
| `.ico` | 8 |
| `.otf` | 7 |
| `.yaml` | 6 |
| `.js` | 5 |
| `.lock` | 5 |
| `.mjs` | 4 |
| `.patch` | 4 |
| `.toml` | 4 |
| `.ttf` | 4 |
| `.webmanifest` | 4 |
| `.nix` | 3 |
| `.sh` | 3 |
| `.mp4` | 2 |
| `.webp` | 2 |
| `.zip` | 2 |
| `.editorconfig` | 1 |
| `.example` | 1 |
| `.gz` | 1 |
| `.jsonc` | 1 |
| `.prettierignore` | 1 |
| `.td` | 1 |
| `.tsv` | 1 |
| `.vscodeignore` | 1 |

## Checklist contract

`.audit/phase0_file_checklist.tsv` contains one row per tracked file with `reviewed` or `not_reviewed` and a Phase 2 batch reference where applicable. It complements but does not replace per-file narrative. Regenerate after path-changing commits.
