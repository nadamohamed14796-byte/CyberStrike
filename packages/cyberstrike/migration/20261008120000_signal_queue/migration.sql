CREATE TABLE IF NOT EXISTS signal_queue (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES session(id) ON DELETE CASCADE,
  parent_id TEXT,
  signal TEXT NOT NULL,
  target TEXT,
  depth INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'pending',
  dedup_key TEXT NOT NULL,
  metadata TEXT,
  time_created INTEGER NOT NULL,
  time_updated INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS signal_queue_dedup_idx ON signal_queue(session_id, dedup_key);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS signal_queue_session_status_idx ON signal_queue(session_id, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS signal_queue_priority_idx ON signal_queue(priority);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS signal_queue_parent_idx ON signal_queue(parent_id);
