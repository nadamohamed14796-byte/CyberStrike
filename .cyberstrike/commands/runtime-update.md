| **description** | Audit, repair, synchronize, and verify CyberStrike learning, skill discovery, routing, scope enforcement, and reporting state without modifying reference skill source files. |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

# CyberStrike Runtime Update

Perform a complete maintenance, repair, integration, and verification pass for the current CyberStrike repository.

The goal is not to produce an audit report only. Discover real problems, repair them when safe, integrate the fixes into the runtime, run verification, and re-check the affected areas.

## 1. Inspect the Current Runtime

Inspect the actual implementation before making changes.

Review:

- learning engine and persistence
- skill registry and skill discovery
- derived skill indexes
- skill routing and selection logic
- scope enforcement
- runtime preflight/guards
- false-positive and signal handling
- report/triage hooks
- relevant configuration and command wiring
- existing tests and test configuration

Do not assume that documented behavior is implemented. Verify it against the actual code.

## 2. Validate Skill Discovery and Indexes

Determine how CyberStrike currently discovers and indexes skills.

If the repository provides a supported command, API, script, or runtime mechanism for rebuilding derived indexes:

- use the supported mechanism
- verify the generated index matches the current skill set
- detect missing, stale, duplicate, or unreachable skill entries
- verify routing metadata is consistent with the discovered skills

Do not invent unsupported commands or silently create a second indexing mechanism.

## 3. Protect Reference Skills

Treat:

`.cyberstrike/skill/**`

as immutable reference content during learning and maintenance.

Learning, routing, indexing, or runtime execution must never rewrite, mutate, or inject generated state into reference skill files.

If a feature requires generated metadata, store it in the appropriate derived/runtime location instead.

Verify that no maintenance operation modified reference skill content.

## 4. Verify Learning Isolation and Persistence

Verify that learning state is stored separately from reference skills.

Check:

- SQLite/database location
- signal persistence
- learning records
- false-positive knowledge
- target/context state where applicable
- initialization and migration behavior
- persistence across process/session boundaries
- handling of missing or corrupted learning data

Learning must improve future decisions without modifying the source skill definitions.

## 5. Audit Routing Quality

Verify the complete routing path:

```text
request/context
    ↓
scope validation
    ↓
skill discovery
    ↓
candidate selection
    ↓
skill routing
    ↓
execution
    ↓
result/evidence
    ↓
learning update
```

Check for:

- unreachable skills
- incorrect routing
- duplicate routing
- missing routing metadata
- overly broad matching
- routing without sufficient context
- learning signals that incorrectly influence routing
- routing decisions that bypass scope enforcement

Fix confirmed implementation problems rather than merely documenting them.

## 6. Verify Scope Enforcement

Ensure scope validation occurs before actions that can interact with targets.

Test:

- explicitly allowed targets
- explicitly excluded targets
- wildcard scope
- subdomain scope
- malformed scope
- out-of-scope targets
- redirects/cross-host transitions where applicable
- tool execution paths that could bypass the normal scope guard

Any execution path capable of bypassing scope enforcement must be treated as a correctness issue.

## 7. Verify Reporting and Triage Integration

Inspect the path from validated evidence to report/triage handling.

Verify that:

- findings are not reported solely from weak signals
- evidence is preserved
- duplicate findings can be identified
- false positives do not automatically become findings
- scope information is retained
- relevant target/provenance information is preserved
- report hooks receive the expected data shape

Do not weaken validation merely to make reporting tests pass.

## 8. Run Tests

Run the narrowest relevant tests first, then the broader test suite where practical.

At minimum, cover:

- skill discovery
- skill indexing
- learning
- learning persistence
- routing
- scope enforcement
- report/triage hooks
- relevant integration tests

Do not claim success without actual test output.

Clearly distinguish:

- passed
- failed
- skipped
- unavailable
- blocked by missing prerequisites
- blocked by external/network dependencies

## 9. Repair and Re-Verify

For every confirmed implementation defect:

1. identify the root cause
2. make the smallest correct fix
3. integrate the fix with the existing runtime
4. add or update regression tests when appropriate
5. run the affected tests
6. run broader verification when practical
7. re-check for regressions

Do not stop after the first successful test run if the repair exposes related failures.

## 10. Final Integrity Check

Before finishing, verify:

- reference skills remain unchanged
- learning data remains isolated
- derived indexes are synchronized
- routing points to valid skills
- scope enforcement is active on relevant execution paths
- report/triage hooks remain connected
- tests reflect the current implementation
- no temporary debugging code or generated junk was left behind

## 11. Final Report

Provide an exact summary containing:

### Changed

Files actually modified and what changed in each.

### Tests

Exact commands/results where available.

### Fixed

Confirmed implementation problems that were repaired.

### Skipped / Blocked

Tests that could not run and the exact reason.

### Remaining

Only genuine unresolved issues or prerequisites.

Do not claim the repository is fully healthy unless the verification evidence supports that conclusion.

Do not modify `.cyberstrike/skill/**` as part of learning, indexing, or maintenance unless the task explicitly requires a deliberate source-skill change.
