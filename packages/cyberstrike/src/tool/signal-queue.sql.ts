import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core"
import { SessionTable } from "../session/session.sql"
import { Timestamps } from "../storage/schema.sql"

export const SignalQueueTable = sqliteTable(
  "signal_queue",
  {
    id: text().primaryKey(),
    session_id: text().references(() => SessionTable.id, { onDelete: "cascade" }),
    parent_id: text(),
    signal: text().notNull(),
    target: text(),
    depth: integer().notNull().default(0),
    attempts: integer().notNull().default(0),
    max_attempts: integer().notNull().default(1),
    priority: integer().notNull().default(50),
    status: text().notNull().default("pending"),
    dedup_key: text().notNull(),
    metadata: text({ mode: "json" }).$type<Record<string, unknown>>(),
    ...Timestamps,
  },
  (table) => [
    uniqueIndex("signal_queue_dedup_idx").on(table.session_id, table.dedup_key),
    index("signal_queue_session_status_idx").on(table.session_id, table.status),
    index("signal_queue_priority_idx").on(table.priority),
    index("signal_queue_parent_idx").on(table.parent_id),
  ],
)
