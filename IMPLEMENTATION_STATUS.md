# Historical Baseline Audit — CyberStrike Hunting Layer

> Historical snapshot audited against `main` at `b7147f5d692908c43759f3324bf62fab8e798d40`. The table below records that earlier baseline, not the current repository state: later commits added hunting-layer source modules, persistence, intake adapters, and dedicated tests. Use the current source and CI workflows for present-day status.

## Audit summary

CyberStrike already provides the runtime, CLI, agent/task system, skill discovery/indexing, MCP integrations, browser/hackbrowser capabilities, persistent session storage, session compaction, observations/coverage notes, and security permission controls. The custom hunting layer must therefore integrate through adapters and remain outside the CyberStrike core wherever possible.

### Baseline requirements

| Component | Status | Audit finding |
|---|---|---|
| CyberStrike runtime | IMPLEMENTED | `packages/cyberstrike` is the existing runtime and must remain authoritative |
| Agents/task execution | IMPLEMENTED | Existing agent/task system is reusable |
| Skill discovery/index | IMPLEMENTED | Existing `src/skill/*` provides discovery, indexing, context and kill-chain support |
| MCP | IMPLEMENTED | Existing MCP server/client/auth stack is reusable |
| Browser capability | IMPLEMENTED | Existing hackbrowser/browser tooling is available |
| Session persistence | IMPLEMENTED | Session DB/API and workspace persistence already exist |
| Session compaction | IMPLEMENTED | Existing compaction machinery exists |
| Security controls | IMPLEMENTED | `.claude/settings.json` contains allow/deny/ask controls |
| Custom scope engine | MISSING | No dedicated hunting-layer scope parser/matcher/lock found in audit |
| Persistent target intelligence | PARTIAL | CyberStrike persists sessions/observations, but target-centric hunting memory is not yet modeled |
| Coverage ledgers/gate | PARTIAL | Session coverage notes exist; dedicated persistent JS/endpoint/UI/function ledgers are missing |
| Function-centric application model | MISSING | No dedicated function/UI ledger |
| JS asset graph | MISSING | No dedicated persistent recursive JS asset graph |
| JS static request extraction | PARTIAL | Existing skill infrastructure can load JS-analysis knowledge, but the requested structured extraction/correlation pipeline is missing |
| JS ↔ request correlation | MISSING | No dedicated bidirectional graph found |
| Request/response hunting DB | PARTIAL | Runtime/session observation exists; hunting-layer normalized records are missing |
| Account-context model | MISSING | No hunting-layer account metadata graph |
| Signal engine | MISSING | No dedicated signal→skill orchestration layer |
| Skill registry/gates | PARTIAL | Existing skill registry/discovery exists; hunting-specific metadata/gating is missing |
| Finding lifecycle | PARTIAL | Vulnerability reporting exists; requested hunting lifecycle/validation state machine is missing |
| 10-question validation gate | MISSING | Dedicated gate missing |
| Adaptive validation/attempt ledger | MISSING | Dedicated 20-attempt campaign ledger/policy missing |
| False-positive DB | MISSING | Dedicated persistent FP store missing |
| Root-cause dedupe | MISSING | Dedicated finding dedupe store missing |
| Evidence provenance | PARTIAL | Runtime observations exist; hunting evidence provenance model missing |
| Exploitability/severity engines | PARTIAL | Existing reporting/skills contain severity knowledge; dedicated evidence-backed scoring missing |
| Variant ledger | MISSING | Dedicated persistent variant ledger missing |
| Chain board | MISSING | Dedicated finding-chain model missing |
| OOB state tracking | MISSING | Dedicated OOB lifecycle missing |
| Learning engine | MISSING | No isolated bounded learning DB/signals/context ledger found |
| Public-source ingestion | MISSING | No hunting-layer source collector pipeline |
| Report pipeline | PARTIAL | Runtime has vulnerability reporting; requested draft/validated/submitted pipeline missing |
| Mission checkpoints/resume | PARTIAL | Session resume exists; hunting mission checkpoints/ledger reconstruction missing |
| Context budget manager | MISSING | Existing context guard/compaction exists; hunting-layer retrieval/budget accounting missing |
| Live observability | PARTIAL | Event stream exists; hunting event taxonomy/dashboard missing |
| Manual replay bridge | PARTIAL | Runtime tools can execute requests; explicit observed/inferred/generated/executed replay provenance is missing |
| JS-derived wordlists | MISSING | No target-specific persistent wordlist pipeline |
| Documentation | PARTIAL | CyberStrike docs exist; hunting-layer operational docs are missing |
| Tests for hunting layer | MISSING | Dedicated hunting-layer integration/unit coverage is missing |

## Security constraints preserved

The existing `.claude/settings.json` deny rules must remain intact. In particular, destructive filesystem commands, force pushes, hard resets, credential/secret file access, and unsafe shell pipelines remain denied.

## Integration decision

The implementation will live under `hunting-new/` as an isolated hunting-intelligence layer. It will use CyberStrike's runtime/session/skill/browser/MCP primitives through explicit adapters rather than replacing them.
