CREATE TABLE IF NOT EXISTS research_queue (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  discovered_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  claimed_at INTEGER,
  completed_at INTEGER,
  lease_owner TEXT,
  lease_until INTEGER
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS research_queue_source_url_idx ON research_queue(source_id, source_url);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS research_queue_status_idx ON research_queue(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS research_queue_lease_idx ON research_queue(lease_until);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS research_queue_sequence_idx ON research_queue(sequence);
