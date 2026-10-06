ALTER TABLE `tool_artifact` ADD COLUMN `request_id` text;
--> statement-breakpoint
ALTER TABLE `tool_artifact` ADD COLUMN `credential_id` text;
--> statement-breakpoint
CREATE INDEX `tool_artifact_request_idx` ON `tool_artifact` (`session_id`,`request_id`);
--> statement-breakpoint
CREATE INDEX `tool_artifact_credential_idx` ON `tool_artifact` (`session_id`,`credential_id`);
