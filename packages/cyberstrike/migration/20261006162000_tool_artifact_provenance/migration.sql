CREATE TABLE IF NOT EXISTS `tool_artifact` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text,
  `call_id` text,
  `request_id` text,
  `credential_id` text,
  `parent_id` text,
  `tool` text NOT NULL,
  `target` text,
  `phase` text,
  `risk` text,
  `scope_decision` text,
  `input` text,
  `output` text,
  `output_preview` text,
  `output_hash` text,
  `result_count` integer,
  `signal` text,
  `metadata` text,
  `time_created` integer NOT NULL,
  `time_updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tool_artifact_session_idx` ON `tool_artifact` (`session_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tool_artifact_call_idx` ON `tool_artifact` (`call_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tool_artifact_target_idx` ON `tool_artifact` (`target`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tool_artifact_tool_idx` ON `tool_artifact` (`tool`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tool_artifact_signal_idx` ON `tool_artifact` (`signal`);
--> statement-breakpoint
ALTER TABLE `tool_artifact` ADD COLUMN `request_id` text;
--> statement-breakpoint
ALTER TABLE `tool_artifact` ADD COLUMN `credential_id` text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tool_artifact_request_idx` ON `tool_artifact` (`session_id`,`request_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tool_artifact_credential_idx` ON `tool_artifact` (`session_id`,`credential_id`);
