# Parallel Research Pipeline

The research pipeline has two separately invokable workers backed by a durable SQLite queue.

## Commands

Run from the repository root:

```bash
bun run dev research discover hackerone-hacktivity --pages 100 --depth 2
bun run dev research learn --limit 50
bun run dev research queue-stats
bun run dev research queue-pending --limit 50
```

To keep the discovery worker polling for new sources, run in terminal 1:

```bash
bun run dev research discover --pages 100 --depth 2 --watch --interval 60
```

To keep the study worker consuming queued reports, run in terminal 2:

```bash
bun run dev research learn --limit 50 --watch --interval 10
```

Stop either process with Ctrl+C. Both can run at the same time. The existing `research sync` command remains available as the legacy combined crawl-and-ingest path.

## Queue behavior

- Queue state is stored in the `research_queue` table in the existing SQLite database.
- A report receives a stable human-readable ID from its monotonically increasing SQLite sequence, formatted as `RPT-000001`. The knowledge table keeps its existing canonical `rkn_...` identifier.
- The unique source-ID/source-URL index deduplicates repeat discoveries. Concurrent enqueue races are handled by re-reading the winning row.
- Study workers atomically claim rows in a transaction and hold a five-minute lease. Expired claims can be reclaimed after a crash.
- Processing attempts are counted. Failures retry; after three attempts the item is rejected with its last error. A report is only marked learned after knowledge ingestion succeeds.
- Extracted material is public research context, not proof that a vulnerability is valid on any particular target. The original source URL and source metadata are retained.
- The crawler is restricted to configured source hosts and HTTPS.

## Acceptance tests still required

Run these from `packages/cyberstrike` before treating the feature as production-verified:

```bash
bun run typecheck
bun test
```

Also exercise these scenarios against a disposable database:
1. Enqueue the same source URL twice; confirm one row and the same RPT ID.
2. Run two learning workers concurrently; confirm one row is claimed by at most one worker.
3. Stop a worker while it owns a row, then wait for lease expiry and confirm it is reclaimed.
4. Simulate a fetch/ingest error and confirm retry state and error details persist.
5. Restart CyberStrike and confirm queue status and RPT IDs remain unchanged.

## Implementation limitations to verify

- The current worker commands are independently runnable and can be run in separate terminals, but there is not yet a supervisor process managing both.
- The existing `research sync` command remains a combined legacy path; use `discover` plus `learn` for the new queue.
- The discovery command's source/page/depth limits should be kept conservative to avoid overloading public sites.
- This branch has not been run in the user's Kali/WSL environment by the assistant; local typecheck and runtime acceptance tests are still necessary.
