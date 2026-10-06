CREATE TABLE `mission_claim` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL REFERENCES `session`(`id`) ON DELETE CASCADE,
  `cell_key` text NOT NULL,
  `agent` text NOT NULL,
  `status` text NOT NULL,
  `expires_at` integer NOT NULL,
  `result_fingerprint` text,
  `time_created` integer NOT NULL,
  `time_updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mission_claim_cell_idx` ON `mission_claim` (`session_id`,`cell_key`);
--> statement-breakpoint
CREATE INDEX `mission_claim_agent_idx` ON `mission_claim` (`session_id`,`agent`,`status`);
--> statement-breakpoint
CREATE INDEX `mission_claim_expiry_idx` ON `mission_claim` (`expires_at`);
