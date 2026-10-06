import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"
import { Timestamps } from "@/storage/schema.sql"

/**
 * Canonical ToolRunRecord: captures complete tool execution lifecycle.
 *
 * Identity (toolRunKey):
 *   sha256(toolId || ":" || targetNormalized || ":" || endpointNormalized || ":" || parametersNormalized)
 *
 * Guarantees:
 *   - same tool + same target + same endpoint + same params → same runKey (dedup)
 *   - same tool + same target + DIFFERENT endpoint → DIFFERENT runKey (preserved)
 *   - same tool + DIFFERENT target → DIFFERENT runKey (preserved)
 *
 * Lifecycle:
 *   pending → running → (completed | failed | timed_out | cancelled)
 *
 * Every transition is timestamped. Errors do not leave records stuck in running state.
 */
export const ToolRunRecordTable = sqliteTable(
  "tool_run_record",
  {
    id: text().primaryKey(), // ascending("tool_run"), unique per execution attempt

    // === Identity ===
    run_key: text().notNull(), // sha256 hash of (toolId:target:endpoint:params), for dedup
    session_id: text().notNull(), // session context
    parent_task_id: text(), // parent task if invoked via task tool
    signal_queue_id: text(), // correlation to signal queue (if claimed from queue)
    call_id: text(), // correlation to tool call ID in message part

    // === Tool & Target ===
    tool_id: text().notNull(), // "bash", "http_replay", "report_vulnerability", etc.
    tool_name: text(), // human label if different from ID
    target: text(), // "https://example.com", "192.168.1.1", AWS ARN, etc. (nullable for tool-agnostic)
    endpoint: text(), // "GET /api/users/{id}" (nullable for non-endpoint tools)
    parameters: text({ mode: "json" }).$type<Record<string, unknown>>(), // normalized args passed to tool

    // === Execution Metadata ===
    status: text().notNull(), // "pending" | "running" | "completed" | "failed" | "timed_out" | "cancelled"
    attempt: integer().notNull(), // 1, 2, 3, ... for retries
    max_attempts: integer().notNull(), // configured max retry count
    timeout_ms: integer(), // timeout limit in ms (nullable = no timeout)

    // === Timing ===
    time_pending: integer(), // when created
    time_started: integer(), // when transitioned to running
    time_ended: integer(), // when transitioned to terminal state
    duration_ms: integer(), // (time_ended - time_started)

    // === Results ===
    exit_code: integer(), // process exit code (0 = success, nonzero = error)
    stdout: text(), // captured standard output
    stderr: text(), // captured standard error
    result_summary: text(), // tool's output/result summary (truncated if large)
    error: text(), // error message if failed

    // === Metadata ===
    scope_verified: integer(), // 1 = scope was checked & valid, 0 = not checked / failed
    agent: text(), // agent that triggered execution
    metadata: text({ mode: "json" }).$type<Record<string, unknown>>(), // extensible metadata

    ...Timestamps,
  },
  (table) => [
    // One row per unique (session, run_key, attempt) triple
    index("tool_run_session_idx").on(table.session_id),
    index("tool_run_key_idx").on(table.session_id, table.run_key),
    index("tool_run_status_idx").on(table.session_id, table.status),
    index("tool_run_tool_idx").on(table.tool_id, table.status),
    index("tool_run_target_idx").on(table.target),
  ],
)
