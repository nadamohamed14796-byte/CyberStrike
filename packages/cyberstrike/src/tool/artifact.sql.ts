import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"
import { SessionTable } from "../session/session.sql"
import { Timestamps } from "../storage/schema.sql"

export const ToolArtifactTable = sqliteTable(
  "tool_artifact",
  {
    id: text().primaryKey(),
    session_id: text().references(() => SessionTable.id, { onDelete: "cascade" }),
    call_id: text(),
    parent_id: text(),
    tool: text().notNull(),
    target: text(),
    phase: text(),
    risk: text(),
    scope_decision: text(),
    input: text({ mode: "json" }).$type<Record<string, unknown>>(),
    output: text(),
    output_preview: text(),
    output_hash: text(),
    result_count: integer(),
    signal: text(),
    metadata: text({ mode: "json" }).$type<Record<string, unknown>>(),
    ...Timestamps,
  },
  (table) => [
    index("tool_artifact_session_idx").on(table.session_id),
    index("tool_artifact_call_idx").on(table.call_id),
    index("tool_artifact_target_idx").on(table.target),
    index("tool_artifact_tool_idx").on(table.tool),
    index("tool_artifact_signal_idx").on(table.signal),
  ],
)
