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


## Additional finding from workflow tracing

| ID | File | Issue and root cause | Fix | Severity |
|---|---|---|---|---|
| INTAKE-01 | `packages/cyberstrike/src/server/routes/session.ts` | The standard duplicate-request branch recorded the observation and forwarded it to the Hunting Layer. The separate race-duplicate branch (`Request.add` returned no row after the preflight `Request.exists` check) recorded the DB observation but returned without calling the Hunting Layer adapter, so concurrent duplicate captures could be absent from target-intelligence graph memory. | Commit `813e51b7779ffb810ca0ebb917ebbd8caf99f5dd` adds the same best-effort Hunting Layer forwarding to the race-duplicate branch, preserving the stable synthetic observation IDs used by the regular duplicate path. CI verification is still pending. | Major for capture-to-target-memory consistency |

## Workflow Trace A — CLI HackBrowser capture to target memory and optional finding

1. `packages/cyberstrike/src/index.ts` configures yargs, registers `HackbrowserCommand`, initializes logging/environment flags, and runs one-time database migration before the selected command handler. `packages/cyberstrike/src/cli/cmd/hackbrowser.ts` starts a loopback HTTP server, creates a session through the SDK, and calls `launchHackbrowser` with the target, session ID, scope/exclude rules, step budget, credentials and headless choice.
2. `packages/cyberstrike/src/tool/hackbrowser-launcher.ts:prepareCrawl` validates the installed worker/runtime and Playwright/Chromium, resolves the default model/provider descriptor, checks whether the selected auth mode can cross the subprocess boundary, and builds the serializable `WorkerOptions`. `launchHackbrowser` starts `hackbrowser-worker.js` with piped stdin/stdout/stderr and sends a JSON-line `start` message; the parent reads worker messages to update `HackbrowserStatus`. A per-session map prevents two workers for the same session, and stop sends an `abort` IPC message.
3. `packages/cyberstrike/src/hackbrowser-subprocess/hackbrowser-worker.ts` reconstructs the provider model from the descriptor and invokes `runCrawl`. `packages/hackbrowser/src/api.ts:runCrawl` validates the URL/mode, checks browser availability unless CDP is used, maps flat `CrawlOptions` to nested `AgentConfig`, and calls the crawl engine. The browser-side capture path assembles a `CapturedRequest`; `packages/hackbrowser/src/ingest.ts:buildIngestPayload/sendIngest` turns it into JSON with `text`, `sessionID`, `credential_id`, optional response data, UI/access context, trigger element, element-role labels, page URL and visited-by labels, then POSTs `/session/ingest`.
4. The `/session/ingest` handler in `packages/cyberstrike/src/server/routes/session.ts` validates and normalizes the capture. Input `text` becomes a normalized method/path/origin/host/site plus stable request hashes. It records per-credential `Observation` data even on duplicates; a new endpoint additionally creates a canonical `Request` record and queues the proxy agent. Both the ordinary-duplicate and race-duplicate paths now also call `feedHuntingLayerFromRequest`, which maps the normalized record into `target/sessionId/request/response/pageUrl` and delegates to Hunting Layer intake. That intake remains best-effort: exceptions log a warning instead of failing the existing ingest pipeline.
5. `hunting-new/src/cyberstrike-intake.ts:ingestCyberStrikeRequest` loads current target intelligence and mission, hydrates the correlation graph, derives parameter candidates, then calls `ingestAndPersistObservation`. `hunting-new/src/intake.ts` adds/links request, response, parameter, JS-asset and function nodes, merges target intelligence, records account labels and writes discovery-ledger entries. The adapter also records cross-host relations for the observed request host, page URL/JS assets and redirects.
6. If `HUNTING_AUTO_EXECUTE=true`, the route kicks off `autoDispatchForTarget` asynchronously. `hunting-new/src/auto-dispatch.ts` serializes dispatch per target and requires a mission; `prepareMultiAgentPlanFromTargetIntelligence` derives signals, resolves skills and persists a task plan; `native-dispatch.ts` runs persisted tasks with `NativeCyberStrikeExecutor`, which turns the task context into a skill invocation and calls `runHuntingTask`. Execution results are normalized, attempt evidence is persisted, `recordAttemptLifecycle` updates hypothesis/validation/learning state, and only a confirmed eligible hypothesis with impact proceeds through `promoteValidatedHypothesis` to a finding and report.

**Data/error boundaries:** worker IPC uses newline-delimited JSON; capture-to-server uses HTTP JSON; target intelligence and task/evidence/report state persist under per-target JSON storage. Unsupported OAuth subprocess auth is rejected before crawl launch. The hunting intake path can be disabled by `HUNTING_LAYER_ENABLED=false`, auto-dispatch requires its separate environment flag, and intake/auto-dispatch exceptions are logged rather than propagated to the HTTP capture. These are intentional decoupling semantics, so a successful capture response alone does not prove the optional Hunting Layer accepted it.

## Workflow Trace B — Hunting Layer lifecycle test to validated report and learning

The actual test `hunting-new/tests/end-to-end-runtime.test.ts` creates a temporary target store and in-scope mission, persists a request plus twenty linked responses, a JS asset and function node, and verifies `signalEngineFromCorrelation` emits `waf_signal_detected`. It then calls `prepareMultiAgentPlan`, persists/dispatches the resulting task, and passes an executor object with the documented `execute(context)` shape to `executeTaskUntilTerminal`.

Each test executor call returns a typed state plus request/response IDs, a summary and a JSON `resultText`. In `multi-agent-runtime.ts`, that text is normalized by `parseExecutionResult`; `ensureAttemptEvidence` and `loadEvidence` resolve evidence IDs; `recordAttemptLifecycle` persists the attempt, evaluates stored validation rules and updates hypothesis/chain/learning state. When the hypothesis is confirmed, the stored validation is eligible and impact is present, `promoteValidatedHypothesis` re-loads persisted mission/hypothesis/evidence/attempts, re-checks scope and the stored evidence gate, deduplicates, builds a validated finding, updates the ledger, writes a report and persists its report record. The test then checks 20 executor calls, a validated finding with multiple response IDs plus the related JS/function, one ready report, a completable mission, and a confirmed learning observation after report transitions to accepted.

The test fixture was fixed without lowering production checks: it now provides distinct baseline/changed response evidence, and its executor matches the declared object contract. This is a test trace, not evidence of a live target crawl or live provider success.

## Noted but not fixed in this pass

- `packages/hackbrowser/src/panel/emit.ts` and `packages/hackbrowser/src/log.ts` use module-level event/log sinks and explicitly document a single-`runCrawl`-per-process assumption. The integrated launcher uses a subprocess per crawl, reducing the normal-path risk, but direct library callers that run concurrent crawls in one process could route telemetry to the wrong sink. This is a documented design limit and was not changed in this focused patch.
- `packages/cyberstrike/src/server/routes/session.ts:59-109` measures a raw request body limit in UTF-8 bytes but truncates with JavaScript string `.slice(0, 8192)` (UTF-16 code units); non-ASCII bodies can therefore exceed the intended byte cap or be cut inside a surrogate pair. Left unchanged in this pass; should be a separate bounded fix with Unicode regression tests.
- `packages/hackbrowser/src/api.ts:272-274` chooses the first non-flag argument as the URL without skipping values belonging to flags. The documented examples put the target first, but a command that puts a value-taking option before the target can misidentify that option's value as the URL. Left unchanged in this pass.
- `multi-agent-runtime.ts`'s finding-promotion catch records a checkpoint but discards the original exception details; a failed promotion is less diagnosable from logs. Left unchanged pending the full error-handling pass and policy for surfacing failures.

## Verification update

At the last status query before the final check, the new production fix commit and inventory/checklist commits had triggered GitHub Actions, but all runs against the then-current head were still `queued`. This branch has no local Bun install in the current working environment, so post-fix correctness remains unverified until the current head's checks finish.
