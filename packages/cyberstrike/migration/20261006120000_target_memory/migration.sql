CREATE TABLE `target_memory` (
  `id` text PRIMARY KEY,
  `project_id` text NOT NULL,
  `kind` text NOT NULL,
  `asset` text NOT NULL,
  `method` text,
  `url` text NOT NULL,
  `request_id` text,
  `page_url` text,
  `content_type` text,
  `content` text,
  `metadata` text,
  `time_created` integer NOT NULL,
  `time_updated` integer NOT NULL,
  CONSTRAINT `target_memory_project_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `target_memory_unique_idx` ON `target_memory` (`project_id`, `kind`, `method`, `url`);
--> statement-breakpoint
CREATE INDEX `target_memory_project_idx` ON `target_memory` (`project_id`);
--> statement-breakpoint
CREATE INDEX `target_memory_asset_idx` ON `target_memory` (`project_id`, `asset`);
--> statement-breakpoint
CREATE INDEX `target_memory_kind_idx` ON `target_memory` (`project_id`, `kind`);
