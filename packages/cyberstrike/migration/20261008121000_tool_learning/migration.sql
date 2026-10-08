CREATE TABLE IF NOT EXISTS tool_learning (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES session(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,
  signal TEXT NOT NULL,
  observations INTEGER NOT NULL DEFAULT 0,
  successes INTEGER NOT NULL DEFAULT 0,
  rejections INTEGER NOT NULL DEFAULT 0,
  usefulness REAL NOT NULL DEFAULT 50,
  last_outcome TEXT,
  last_target TEXT,
  last_evidence TEXT,
  time_created INTEGER NOT NULL,
  time_updated INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS tool_learning_session_tool_signal_idx ON tool_learning(session_id, tool, signal);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tool_learning_tool_idx ON tool_learning(tool);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tool_learning_signal_idx ON tool_learning(signal);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS tool_learning_event (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES session(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,
  signal TEXT NOT NULL,
  target TEXT,
  outcome TEXT NOT NULL,
  evidence TEXT,
  time_created INTEGER NOT NULL,
  time_updated INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tool_learning_event_tool_idx ON tool_learning_event(tool);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tool_learning_event_signal_idx ON tool_learning_event(signal);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tool_learning_event_session_idx ON tool_learning_event(session_id);
