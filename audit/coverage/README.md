# CyberStrike audit coverage checkpoint

## Inventory basis

- Repository: `nadamohamed14796-byte/CyberStrike`
- Branch: `fix/functional-audit-2026-10-10`
- Path-list snapshot commit: `7e34d99ae2c6ce3fda8be5bbd5320c02c9445056`
- Tracked files represented: 11513
- Directories: 8684
- Recursive tree entries: 20197

## Status definitions

The TSV files are exact path-level ledgers for the tree snapshot above. `U` means the full Phase 2 file row is incomplete. `T` means the path was read only in a bounded CI-root-cause pass; it does not count as full Phase 2 coverage. `M` means an audit inventory/checkpoint artifact. No production source file is marked fully audited.

The full repository audit is incomplete: **0 of 11513 files have a complete formal Phase 2 row**. The triage findings file records concrete issues verified against source and original CI logs. Work must resume in bounded directory batches and the status must only be upgraded after the full per-file row is completed.

## Inventory files

- `directory-counts-cyberstrike.tsv`: direct file counts and extension counts for all directories under `.cyberstrike`
- `directory-counts-packages.tsv`: direct file counts and extension counts for all directories under `packages`
- `directory-counts-other.tsv`: direct file counts and extension counts for all remaining directories, including repository root and this audit directory
- `checklist-cyberstrike.tsv`: every tracked file path under `.cyberstrike`
- `checklist-packages.tsv`: every tracked file path under `packages`
- `checklist-other.tsv`: every other tracked file path, including these audit artifacts
- `triage-findings.md`: bounded findings, fix references, relationship map, and honest verification status

## Top-level tracked-file counts

- `.claude`: 1
- `.cyberstrike`: 8156
- `.github`: 31
- `.husky`: 1
- `.signpath`: 1
- `.vscode`: 2
- `[root]`: 25
- `assets`: 5
- `audit`: 8
- `docs`: 5
- `github`: 9
- `hunting-new`: 145
- `infra`: 5
- `nix`: 5
- `packages`: 3081
- `patches`: 3
- `script`: 14
- `sdks`: 15
- `specs`: 1

The root `package.json` `test` script intentionally exits with the text `do not run tests from root`; do not assume `bun run test` is the test-suite invocation.
