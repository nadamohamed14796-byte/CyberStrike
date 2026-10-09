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

Before initializing a mission, add only explicitly authorized assets to `hunting-new/config/scope.yaml`. For example, replace the empty `rules: []` with:

```yaml
  rules:
    - value: example.com
      protocols: [https]
      ports: [443]
```

From the repository root, verify the configured scope and initialize the mission:

`bun run hunting-new/src/cli.ts scope https://example.com`

`bun run hunting-new/src/cli.ts init https://example.com`

`bun run hunting-new/src/cli.ts status example.com`

An empty rule list blocks every target. Exclusions override matching allow rules.

The CLI stores target state under `hunting-new/targets/<target-slug>/`.

## Safety

Unknown scope is blocked. Generated or inferred requests are not proof. Active validation must be authorized and must pass scope, authorization, rate-limit, risk and variant gates before execution.
