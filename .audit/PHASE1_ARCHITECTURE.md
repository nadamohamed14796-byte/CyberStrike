# Phase 1 — Architecture & Relationships

## 1.1 Package map

16 workspace packages (per `package.json` `workspaces.packages` glob: `packages/*`, `packages/console/*`, `packages/sdk/js`, `packages/slack`, `packages/hackbrowser`) + the VS Code extension at `sdks/vscode` (NOT in the workspace glob — built/released independently).

| Package | npm name | Path | Files | Purpose | Bin/entry |
|---|---|---|---|---|---|
| CLI/agent core | `cyberstrike` | `packages/cyberstrike` | 793 | **The core.** AI agent harness: session mgmt, tool execution, LLM provider adapters, skill routing, SQLite migrations (41 migration files), learning/memory subsystem, ACP/LSP/MCP protocol adapters, Postman-export, shell/pty. | `bin/cyberstrike` (shells out to a resolved binary via `CYBERSTRIKE_BIN_PATH` or platform-specific install) |
| Web app | `@cyberstrike-io/app` | `packages/app` | 192 | SolidStart web frontend | Vite |
| Console (5 sub-pkgs) | `@cyberstrike-io/console-{app,core,function,mail,resource}` | `packages/console/*` | 423 | Admin/billing console — SST-deployed | — |
| Enterprise | `@cyberstrike-io/enterprise` | `packages/enterprise` | 19 | Enterprise-tier add-ons | — |
| Function | `@cyberstrike-io/function` | `packages/function` | 4 | Cloudflare/SST function handlers | — |
| HackBrowser | `@cyberstrike-io/hackbrowser` | `packages/hackbrowser` | 37 | Browser-capture/proxy component referenced in the brief's Phase-3 workflow list | `./api` export |
| Plugin | `@cyberstrike-io/plugin` | `packages/plugin` | 9 | Plugin SDK surface | `./tool` export |
| SDK (JS) | `@cyberstrike-io/sdk` | `packages/sdk/js` | ~40 | Client SDK, depended on by app/plugin/slack | — |
| Slack | `@cyberstrike-io/slack` | `packages/slack` | 6 | Slack bot integration | — |
| UI | `@cyberstrike-io/ui` | `packages/ui` | 1,451 | Component library — 1,207 SVG icons + 272 `.tsx` components + theming | multiple sub-path exports |
| Util | `@cyberstrike-io/util` | `packages/util` | 14 | Shared utilities, leaf dependency | — |
| Script | `@cyberstrike-io/script` | `packages/script` | 4 | Root build/release scripts | — |
| Identity | (no package.json) | `packages/identity` | 6 | Brand assets only (SVG/PNG logos), not code | — |
| Containers | (no package.json) | `packages/containers` | 6 | 4 Dockerfiles + 1 build script | — |
| Extensions | (no package.json) | `packages/extensions` | 2 | Zed editor extension manifest | — |
| VS Code SDK | `cyberstrike` (!) | `sdks/vscode` | 12 | VS Code extension | separate build, not in workspace |

## 1.2 Internal (workspace) dependency graph

```
util  (leaf — no internal deps)
  ^
  |
sdk ──────────────┐
  ^                │
  |                │
ui ←── util         │
  ^    ^            │
  |    |            │
app  enterprise     plugin, slack  (each -> sdk only)
  (app -> sdk, ui, util)

console-mail, console-resource   (leaves)
  ^
  |
console-core ──> console-mail, console-resource
  ^
  |
console-function ──> console-core, console-resource
console-app ──> console-core, console-mail, console-resource, ui
```

`cyberstrike` (the CLI/agent core, 793 files) declares **no internal workspace dependencies** in its `package.json` (81 external deps, 0 of them other workspace packages) — it's architecturally standalone from the web/console/ui packages, which matches it being a separately-distributed CLI binary. `hackbrowser`, `function`, `script`, `identity`, `containers`, `extensions` are also leaves with no internal deps declared.

**Finding (Minor, naming collision):** `packages/cyberstrike/package.json` and `sdks/vscode/package.json` both declare `"name": "cyberstrike"`. `sdks/vscode` is excluded from the root `workspaces` glob, so Bun's workspace resolver doesn't collide on it — this isn't a build breaker — but it means an npm registry publish of `sdks/vscode` as `cyberstrike` would collide with (or require careful separation from) the CLI package's own publish identity, and it's a readability trap for anyone grepping the repo for "the cyberstrike package." Worth a rename on the VS Code side (e.g. `cyberstrike-vscode`) as a Minor fix — low risk, traceable to this finding.

## 1.3 Config relationships

- **`tsconfig.json` (root)** — extends `@tsconfig/bun/tsconfig.json`, no local overrides. Each package/sub-package likely has its own `tsconfig.json` extending this (not yet verified per-package — Phase 2 will confirm per package).
- **`turbo.json`** — defines 4 tasks: `typecheck` (no deps declared — runs standalone per package), `build` (depends on `^build`, i.e. upstream workspace deps build first, outputs `dist/**`), and two **package-scoped test tasks**: `cyberstrike#test` and `@cyberstrike-io/app#test`, both gated on `^build`. Notably **no generic `test` task** — only these two packages have Turbo-orchestrated tests; other packages' `test` scripts (if any) aren't part of the Turbo pipeline, meaning `turbo run test` repo-wide would only exercise 2 of 16 packages. Flagged for Phase 2/3 confirmation — need to check root `package.json` scripts (`test`) to see if it calls turbo or bun test directly across all packages.
- **`bunfig.toml`** — not yet inspected in detail (1-line-ish config file; low risk, will cover in the root-files Phase 2 batch).
- **`sst.config.ts` / `sst-env.d.ts`** — SST deployment config, governs `console/*`, `function`, likely `app` deploy targets. Not yet traced to specific stacks — Phase 2/3.
- **`flake.nix` / `flake.lock`** — Nix dev-shell/build definition; not yet inspected.

## 1.4 CI/workflow inventory (`.github/workflows/`, 19 files)

`beta.yml`, `codeql.yml`, `cyberstrike.yml`, `deploy.yml`, `duplicate-issues.yml`, `generate.yml`, `hunting-layer.yml`, `integrity-audit.yml`, `nix-hashes.yml`, `pr-management.yml`, `pr-standards.yml`, `publish.yml`, `release-github-action.yml`, `review.yml`, `sign-cli.yml`, `skills-audit.yml`, `stats.yml`, `test.yml`, `typecheck.yml`.

Good match to the audit brief's named required checks (`test`, `integrity-audit`, `hunting-layer`, `typecheck`, `skills-audit`, `CodeQL` all present as workflow files) — confirms those are real CI gates in this repo, not assumptions. Per-workflow trigger/job detail deferred to Phase 2's `.github/` batch.

## 1.5 Entry points

- **CLI (`packages/cyberstrike/bin/cyberstrike`):** a thin Node shim — resolves `CYBERSTRIKE_BIN_PATH` env var or a platform-specific installed binary, then `spawnSync`s it, forwarding argv and exit code. The actual CLI logic is NOT in this shim; it's in a compiled binary resolved at runtime (likely built from `packages/cyberstrike/src/cli/`). Need to trace the resolution path in Phase 3 to confirm what runs when no `CYBERSTRIKE_BIN_PATH` is set on a fresh install — this is exactly the kind of "undocumented prerequisite" the brief's Phase 3 asks to flag.
- **`packages/cyberstrike/src/`** has 45 top-level subdirectories under `src/` (agent, tool, session, learning, memory, skill, mcp, acp, lsp, auth, provider, scheduler, shell, pty, worktree, etc.) — this is the real surface area for Phase 2's file-by-file pass and will need to be batched directory-by-directory given its size.
- **Web app:** Vite + SolidStart, entry not yet traced (`packages/app`).

## 1.6 Runtime communication map — deferred to Phase 2/3

Not yet mapped; requires reading actual source in `packages/cyberstrike/src/{server,session,bus,mcp,acp}` and `packages/app`/`packages/console` to identify real mechanisms (HTTP/WebSocket/IPC/child-process). Flagging now rather than guessing from directory names alone, per the brief's "never infer from naming alone" constraint.

## 1.7 State & lifecycle map — deferred to Phase 2/3

Same — requires reading `src/storage`, `src/session`, `src/global`, `src/scheduler` before this can be stated accurately.

---

## Checklist update

Architecture-level package.json/config files read this pass (16 package.json + turbo.json + root tsconfig.json + workflow filenames): marked `reviewed_batch` in the checklist as a structural pass; full Phase-2 narrative rows for these specific files still pending (structural read ≠ the bugs/logic-row treatment the brief wants — will be done when each package's batch comes up).

**Next:** Phase 2, Batch 1 — `packages/cyberstrike/src/` is 793 files and the architectural core; too large for one batch. Proposing to start with its smallest, most load-bearing subdirectory first (`src/global`, `src/id`, `src/flag`, `src/env` — foundational, likely imported everywhere else) rather than the biggest, so later batches' "called by" columns have something to reference.
