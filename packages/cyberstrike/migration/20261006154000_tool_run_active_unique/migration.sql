CREATE UNIQUE INDEX IF NOT EXISTS `tool_run_active_unique_idx` ON `tool_run_record` (`session_id`, `run_key`) WHERE status IN ('pending','running');
