CREATE TABLE IF NOT EXISTS `tool_run_record` (
  `id` text PRIMARY KEY NOT NULL,
  `run_key` text NOT NULL,
  `session_id` text NOT NULL,
  `parent_task_id` text,
  `signal_queue_id` text,
  `call_id` text,
  `tool_id` text NOT NULL,
  `tool_name` text,
  `target` text,
  `endpoint` text,
  `parameters` text,
  `status` text NOT NULL,
  `attempt` integer NOT NULL,
  `max_attempts` integer NOT NULL,
  `timeout_ms` integer,
  `time_pending` integer,
  `time_started` integer,
  `time_ended` integer,
  `duration_ms` integer,
  `exit_code` integer,
  `stdout` text,
  `stderr` text,
  `result_summary` text,
  `error` text,
  `scope_verified` integer,
  `agent` text,
  `metadata` text,
  `time_created` integer NOT NULL,
  `time_updated` integer NOT NULL
);
CREATE INDEX IF NOT EXISTS `tool_run_session_idx` ON `tool_run_record` (`session_id`);
CREATE INDEX IF NOT EXISTS `tool_run_key_idx` ON `tool_run_record` (`session_id`, `run_key`);
CREATE INDEX IF NOT EXISTS `tool_run_status_idx` ON `tool_run_record` (`session_id`, `status`);
CREATE INDEX IF NOT EXISTS `tool_run_tool_idx` ON `tool_run_record` (`tool_id`, `status`);
CREATE INDEX IF NOT EXISTS `tool_run_target_idx` ON `tool_run_record` (`target`);
