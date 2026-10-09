# Hunting Layer Architecture

CyberStrike remains the runtime. The hunting layer is a stateful intelligence/application model around it.

```
CyberStrike Runtime
  -> Scope Lock
  -> Target Memory + Coverage Ledgers
  -> Browser / Proxy observations
  -> JS / API / Function graph
  -> Signal Engine
  -> Contextual Skills
  -> Hypothesis + Adaptive Validation
  -> Evidence / Dedup / Severity
  -> Report
  -> Bounded Learning
```

## Source of truth

Conversation context is not authoritative. Target files, ledgers, mission state and evidence references are authoritative.

## Existing CyberStrike reused

- session persistence and resume
- session compaction
- agent/task orchestration
- skill discovery/indexing
- browser/hackbrowser
- MCP
- event stream
- security permission controls

## Hunting-layer responsibilities

- scope semantics
- target-centric memory
- coverage completion
- application-function modeling
- JS/API intelligence graph
- signal-driven skill selection
- finding lifecycle and evidence gates
- adaptive attempt accounting
- bounded learning
- professional reporting

## Provenance

Every request-like artifact must distinguish observed, JS-derived, generated/template and executed states. API documentation is an intelligence source, not authoritative truth.
