# CyberStrike audit: bounded CI-root-cause pass

## Scope and truth-in-reporting

This is a bounded audit checkpoint, not the completed full-repository audit requested in the audit specification. The source tree before audit metadata was added contained 11,505 files in 8,682 directories on `fix/functional-audit-2026-10-10`. A recursive Git tree was retrieved from GitHub and used to generate the per-directory file/type counts and path-level status checklists under this directory. Files marked `T` were inspected only to diagnose concrete CI failures; that status is not full Phase 2 coverage. Files marked `U` have not yet received individual full-file audit rows. The formal complete Phase 2 coverage remains incomplete.

## Confirmed CI issues and changes

| ID | File | Evidence / root cause | Fix in this branch | Class |
|---|---|---|---|---|
| CI-01 | `hunting-new/src/execution-result.ts` | TypeScript rejected duplicated `rootCause` and `reproduction` keys in the parsed result object (TS1117). | Removed duplicate keys while preserving fallback parsing from `steps_to_reproduce`. | Production blocker |
| CI-02 | `hunting-new/src/finding-promotion.ts` | Optional endpoint/root-cause/reproduction fields were passed into `Record<string,string>` as possibly undefined (TS2322). | Build report sections with required strings and add optional keys only when defined. | Production blocker |
| CI-03 | `hunting-new/src/target-intelligence.ts` | Captured graph parameters allowed `header`, but `ParameterCandidate.location` omitted it (TS2322); `sources` literal widened to `string[]` (TS2322). | Aligned the location union with the graph contract and preserved the `observed` literal type. | Contract/type blockers |
| CI-04 | `hunting-new/src/multi-agent-planner.ts` | `SkillRegistry` was imported type-only but instantiated; task dependency values are agent roles but were typed as arbitrary strings, breaking the role-keyed lane map and callback inference (TS1361/TS2345/TS7053/TS7006). | Imported the runtime class as a value and typed dependencies as `HuntingAgentRole[]`. | Production blocker |
| CI-05 | `hunting-new/src/multi-agent-runtime.ts` | Duplicate type/value imports of `LearningEngine`, task state union could include `running` at a terminal-only API, and endpoint ledger helper was called without an import. A separate hand-built endpoint ID also diverged from the shared ID helper. | Removed the duplicate import, narrowed the terminal state before calling `finishAgentTask`, imported ledger helpers, and used `stableLedgerId`. | Production blocker |
| CI-06 | `hunting-new/src/signals.ts` | Signal correlation called `toUpperCase()` on a request method that the TypeScript contract treats as possibly absent (TS18048). | Skip observations whose method is missing or blank. | Input-validation blocker |
| TEST-01 | `hunting-new/tests/finding-promotion.test.ts` | The persisted false-positive test's response fixture did not represent a behavior change, so the production validation gate correctly rejected promotion. | Made the test fixture include a distinct, persisted response with different behavior and included its ID in the supplied validation evidence. Production validation requirements were not relaxed. | Test-only correction |
| TEST-02 | `hunting-new/tests/end-to-end-runtime.test.ts` | End-to-end test passed a function to an API whose runtime contract expects an object with an `execute` method; CI failed with `executor.execute is not a function`. | Wrapped the callback in the expected `{ execute: async ... }` adapter shape. | Test-only correction |

The initial code-rooted evidence came from CI for branch commit `7da21aa84d8b01dbe5a03f94332af1c71ad41817`: typecheck failed with the errors above and the Hunting Layer run reported 79 passing / 2 failing tests. Those results proved the original defects; they do not prove the subsequent fixes.

## Relationship map for the tested slice

```text
Captured HTTP observations
  -> correlation graph (requests, responses, JS assets, functions, parameters, edges)
  -> target-intelligence persistence (per-target JSON, merged/deduplicated records)
  -> signal generation (HTTP response patterns and API-method comparisons)
  -> skill registry and skill routing
  -> multi-agent plan (role, skill, endpoint, dependencies, evidence context)
  -> persistent task state + bounded attempt ledger
  -> executor contract { execute(context) }
  -> structured execution-result parser
  -> attempt lifecycle + evidence store
  -> stored validation gate
  -> finding promotion / false-positive dedupe
  -> report draft and report record
  -> report review outcome -> learning store
```

The reviewed contracts include `correlation.ts` for observation graph shapes, `target-intelligence.ts` for persisted target memory, `skill-registry.ts` for skill metadata/dependencies, `multi-agent-planner.ts` for the task/role plan, `multi-agent-runtime.ts` for the executor boundary, `execution-result.ts` for the structured result payload, `validation-gate.ts` for reportability checks, and `ledger.ts` / `report.ts` for persisted state. This describes only the bounded Hunting Layer slice and is not a full dependency graph of every package.

## CI and runnable status

The current branch head when this checkpoint was first prepared was `9523c5ff3d9d339f130169d2c84e055ea85b1133`. At that time, GitHub Actions for `test`, `typecheck`, `hunting-layer`, `integrity-audit`, `skills-audit`, `CodeQL`, and `pr-standards` were queued. Queued results are unverified. No local Bun build or test run was performed in this environment. Re-check the current branch head's required checks before merge; an end-to-end runnable claim is not justified until the relevant post-fix checks finish successfully.

Useful commands for maintainer verification after pulling the branch:

```sh
bun install
bun run typecheck
bun run audit:runtime
bun test
```

The root `package.json` deliberately makes `bun run test` exit with a message instructing contributors not to run tests from the root, so `bun test` and the project workflows should be evaluated against the current repository's intended test layout. A green top-level status alone is not proof that the CLI, UI, proxy capture, or remote tool workflows run end-to-end.

## What remains

- Complete full individual-file rows for all remaining `U` paths (and upgrade `T` paths only after reviewing them in full).
- Finish full package import/dependency mapping, CI/deployment/config relationships, shared state/lifecycle map, and 2–3 full UI/CLI/proxy/deployment workflow traces.
- Re-run and inspect post-fix CI logs at the newest PR head; fix any new failures, then poll the final check state.
- Do not merge until required checks are completed and green.
