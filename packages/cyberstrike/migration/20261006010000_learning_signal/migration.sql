CREATE TABLE IF NOT EXISTS `learning_signal` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text REFERENCES session(id) ON DELETE CASCADE,
  `hook` text NOT NULL,
  `signal` text NOT NULL,
  `skill_name` text,
  `agent` text,
  `target` text,
  `category` text,
  `outcome` text,
  `metadata` text,
  `time_created` integer NOT NULL,
  `time_updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `learning_signal_session_idx` ON `learning_signal` (`session_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `learning_signal_hook_idx` ON `learning_signal` (`hook`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `learning_signal_skill_idx` ON `learning_signal` (`skill_name`);
