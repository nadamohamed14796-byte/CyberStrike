# Operations

## Configure authorized scope first

Edit `hunting-new/config/scope.yaml` and list only assets you are authorized to test. For example:

```yaml
scope:
  mode: explicit
  unknown_target: block
  exclusions: []
  rules:
    - value: example.com
      protocols: [https]
      ports: [443]
```

An empty `rules: []` list blocks every target. Exclusions override matching allow rules.

## Inspect scope

```bash
bun run hunting-new/src/cli.ts scope https://example.com
```

## Initialize

```bash
bun run hunting-new/src/cli.ts init https://example.com
```

## Inspect coverage

```bash
bun run hunting-new/src/cli.ts status example.com
``

## Resume

```bash
bun run hunting-new/src/cli.ts resume example.com
``

## Completion

```bash
bun run hunting-new/src/cli.ts complete example.com
```

Completion is refused while any coverage ledger has pending items.

## CyberStrike integration

The adapter in `src/cyberstrike.ts` delegates execution to the installed CyberStrike CLI. The hunting layer does not replace CyberStrike's agents or tool runtime.

## Target state

State is stored below `hunting-new/targets/<target-slug>/` as organized JSON/JSONL artifacts. Secrets and passwords must never be stored.
