CREATE TABLE `false_positive_memory` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL REFERENCES `session`(`id`) ON DELETE CASCADE,
  `fingerprint` text NOT NULL,
  `vuln_class` text NOT NULL,
  `endpoint_pattern` text,
  `asset_pattern` text,
  `reason` text NOT NULL,
  `evidence` text,
  `source_finding_id` text,
  `confidence` real DEFAULT 0.5 NOT NULL,
  `hit_count` integer DEFAULT 1 NOT NULL,
  `last_seen_at` integer NOT NULL,
  `time_created` integer NOT NULL,
  `time_updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `false_positive_fingerprint_idx` ON `false_positive_memory` (`session_id`,`fingerprint`);
--> statement-breakpoint
CREATE INDEX `false_positive_class_idx` ON `false_positive_memory` (`session_id`,`vuln_class`);
--> statement-breakpoint
CREATE INDEX `false_positive_endpoint_idx` ON `false_positive_memory` (`session_id`,`endpoint_pattern`);
