---
description: refresh the learned briefing from public writeups and your own notes
---

Refresh the agent's learned briefing.

1. From the `packages/cyberstrike` directory, run `bun run script/sync-briefing.ts`. It fetches the configured public writeup sources into the cache outside the project, processes them, and rebuilds `.cyberstrike/agent-briefing.md`.
2. Report the result for each source: the commit it is now at, the number of writeups indexed, and whether the briefing changed.
3. If a source fails (network or git error), say which one and keep the others. Do not stop the whole update.
4. Do not edit any SKILL.md file. The briefing is the only output of this command.
