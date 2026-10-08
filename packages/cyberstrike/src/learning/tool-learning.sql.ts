import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core"
import { SessionTable } from "../session/session.sql"
import { Timestamps } from "../storage/schema.sql"

export const ToolLearningTable = sqliteTable(
  "tool_learning",
  {
    id: text().primaryKey(),
    session_id: text().references(() => SessionTable.id, { onDelete: "cascade" }),
    tool: text().notNull(),
    signal: text().notNull(),
    observations: integer().notNull().default(0),
    successes: integer().notNull().default(0),
    rejections: integer().notNull().default(0),
    usefulness: real().notNull().default(50),
    last_outcome: text(),
    last_target: text(),
    last_evidence: text(),
    ...Timestamps,
  },
  (table) => [
    uniqueIndex("tool_learning_session_tool_signal_idx").on(table.session_id, table.tool, table.signal),
    index("tool_learning_tool_idx").on(table.tool),
    index("tool_learning_signal_idx").on(table.signal),
  ],
)

export const ToolLearningEventTable = sqliteTable(
  "tool_learning_event",
  {
    id: text().primaryKey(),
    session_id: text().references(() => SessionTable.id, { onDelete: "cascade" }),
    tool: text().notNull(),
    signal: text().notNull(),
    target: text(),
    outcome: text().notNull(),
    evidence: text(),
    ...Timestamps,
  },
  (table) => [
    index("tool_learning_event_tool_idx").on(table.tool),
    index("tool_learning_event_signal_idx").on(table.signal),
    index("tool_learning_event_session_idx").on(table.session_id),
  ],
)
