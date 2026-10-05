# Troubleshooting

## MISSION_BLOCKED

Check that an explicit scope rule matches the target. Newly discovered hosts require a fresh scope decision.

## COVERAGE_GATE_FAILED

Run `status` and inspect pending JS, endpoint, UI, function, parameter, request, hypothesis or finding ledger items. Each remaining item needs a real test, a reasoned block, or NOT_APPLICABLE.

## Resume after compaction

Reload mission state, ledgers, target memory, attempts, evidence IDs and next actions. Do not rely on the previous chat transcript.

## JS analysis limitations

The first foundation analyzer uses deterministic static extraction and confidence labels. It is deliberately not treated as proof. AST-backed analysis and deeper framework-specific adapters remain a subsequent implementation phase.

## Runtime unavailable

Use `runtimeAvailable()` from `src/cyberstrike.ts` to verify that the CyberStrike CLI is installed and callable.
