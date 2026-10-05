# CyberStrike Hunting Layer

A modular application-intelligence layer built on top of the existing CyberStrike runtime.

## Principle

One Mission. Focused Hunting. Higher Quality Findings.

## What is implemented in this first foundation

- explicit scope gate
- persistent target mission state
- persistent coverage ledgers for JS/endpoints/UI/functions/parameters/requests/hypotheses/findings
- contextual signal engine
- bounded skill selection
- adaptive validation attempt ledger with a 20-attempt default
- ten-question verification gate
- JS asset discovery and structured request leads
- finding fingerprint/deduplication
- evidence-backed severity gate
- coverage completion gate
- context compaction state extraction
- provenance schema
- CyberStrike runtime registry

The layer intentionally does not replace CyberStrike agents, skills, sessions, browser or MCP. Integration adapters are added incrementally.

## Run

From the repository root:

`bun run hunting-new/src/cli.ts init example.com`

`bun run hunting-new/src/cli.ts status example.com`

The CLI stores target state under `hunting-new/targets/<target-slug>/`.

## Safety

Unknown scope is blocked. Generated or inferred requests are not proof. Active validation must be authorized and must pass scope, authorization, rate-limit, risk and variant gates before execution.
