---
description: Refresh and validate CyberStrike learning, skill routing, and test state without modifying reference skill source files.
---

Perform a repository maintenance update for CyberStrike.

1. Inspect the current learning/router implementation and the skill index.
2. Rebuild or refresh derived skill indexes when the repository provides a supported command/API for doing so.
3. Run the relevant unit tests for discovery, learning, routing, scope enforcement, and report/triage hooks.
4. Keep `.cyberstrike/skill/**` reference content immutable; never rewrite a reference skill as a side effect of learning.
5. Keep SQLite learning data separate from source skills.
6. Do not invent test success. Report exact failures, skipped network tests, and any missing prerequisites.
7. Summarize changed files and remaining issues at the end.
