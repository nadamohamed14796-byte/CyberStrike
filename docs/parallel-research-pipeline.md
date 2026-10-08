# Parallel Research Pipeline — Implementation Contract

This document defines the durable contract for splitting public research ingestion into independent discovery and study workers. It is deliberately not a claim that the workers are already wired into the CLI.

## Required pipeline

1. **Discover worker**: crawl only configured public research sources, normalize URLs, and enqueue each candidate before expensive parsing.
2. **Study worker**: claim pending rows transactionally, parse and classify content, save report_knowledge, then mark the queue item complete in the same recoverable workflow.
3. **Independent operation**: both workers may run concurrently; neither should wait for the other to finish a full crawl.
4. **Durability**: queue state lives in SQLite, not process memory. Restart resumes pending and expired leases.
5. **Stable numbering**: allocate a monotonic human-facing RPT-000001 sequence in the database. Keep the existing rkn_... identifier as the canonical knowledge-row ID. Never derive report numbers from the current row count.
6. **Deduplication**: unique normalized source URL plus content fingerprint; duplicate discoveries increment sightings rather than create duplicate lessons.
7. **Crash safety**: leases have expiry, attempts are bounded, and failures store a short error plus retry time. A worker must only mark an item learned after the knowledge record is persisted.
8. **Observability**: expose counts for discovered, pending, studying, learned, duplicate, retry, and failed; show each report number, source, and state.
9. **Parallelism**: bounded concurrency for both workers, SQLite busy timeout, WAL, and atomic claim updates to prevent two study workers claiming the same report.
10. **Safety and provenance**: only configured public sources and allowlisted hosts are crawled. Keep original source URL and timestamp; treat extracted claims as unverified research, not confirmed vulnerabilities.

## Acceptance tests

- Two discover workers enqueue the same URL concurrently and produce one queue record.
- Two study workers cannot claim the same pending row.
- Killing a worker after claim allows the lease to expire and the row to be retried.
- A knowledge persistence error never marks a row learned.
- Re-running discovery preserves the stable report number.
- Queue counts and per-report status survive process restart.
- A source failure is recorded and does not stop other sources.
- Existing research sync, research search, research recommend, and research stats commands remain compatible.

## Current implementation status

The current research sync path combines crawling, extraction, and knowledge ingestion inside syncResearchSource; it runs up to four sources concurrently, but it does not yet expose a durable per-report queue with independent discovery and study workers. This contract must be implemented in code and verified with tests before describing the pipeline as operational.