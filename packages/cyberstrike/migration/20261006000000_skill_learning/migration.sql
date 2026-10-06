CREATE TABLE IF NOT EXISTS `skill_learning` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text REFERENCES session(id) ON DELETE CASCADE,
  `skill_name` text NOT NULL,
  `source` text,
  `category` text,
  `tags` text,
  `concepts` text,
  `observations` integer DEFAULT 0 NOT NULL,
  `successes` integer DEFAULT 0 NOT NULL,
  `rejections` integer DEFAULT 0 NOT NULL,
  `usefulness` real DEFAULT 0 NOT NULL,
  `last_used_at` integer,
  `time_created` integer NOT NULL,
  `time_updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `skill_learning_session_skill_idx` ON `skill_learning` (`session_id`,`skill_name`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `skill_learning_skill_idx` ON `skill_learning` (`skill_name`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `skill_learning_event` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text REFERENCES session(id) ON DELETE CASCADE,
  `skill_name` text NOT NULL,
  `event` text NOT NULL,
  `outcome` text,
  `concepts` text,
  `evidence` text,
  `time_created` integer NOT NULL,
  `time_updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `skill_learning_event_skill_idx` ON `skill_learning_event` (`skill_name`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `skill_learning_event_session_idx` ON `skill_learning_event` (`session_id`);