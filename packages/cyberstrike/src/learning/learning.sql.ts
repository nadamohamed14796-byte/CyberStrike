import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core"
import { SessionTable } from "../session/session.sql"
import { Timestamps } from "../storage/schema.sql"

export const SkillLearningTable = sqliteTable("skill_learning", {
  id: text().primaryKey(), session_id: text().references(() => SessionTable.id, { onDelete: "cascade" }),
  skill_name: text().notNull(), source: text(), category: text(), tags: text({ mode: "json" }).$type<string[]>(),
  concepts: text({ mode: "json" }).$type<string[]>(), observations: integer().notNull().default(0),
  successes: integer().notNull().default(0), rejections: integer().notNull().default(0), usefulness: real().notNull().default(0),
  last_used_at: integer(), ...Timestamps,
}, (table) => [uniqueIndex("skill_learning_session_skill_idx").on(table.session_id, table.skill_name), index("skill_learning_skill_idx").on(table.skill_name)])

export const SkillLearningEventTable = sqliteTable("skill_learning_event", {
  id: text().primaryKey(), session_id: text().references(() => SessionTable.id, { onDelete: "cascade" }), skill_name: text().notNull(),
  event: text().notNull(), outcome: text(), concepts: text({ mode: "json" }).$type<string[]>(), evidence: text(), ...Timestamps,
}, (table) => [index("skill_learning_event_skill_idx").on(table.skill_name), index("skill_learning_event_session_idx").on(table.session_id)])

export const LearningSignalTable = sqliteTable("learning_signal", {
  id: text().primaryKey(),
  session_id: text().references(() => SessionTable.id, { onDelete: "cascade" }),
  hook: text().notNull(),
  signal: text().notNull(),
  skill_name: text(),
  agent: text(),
  target: text(),
  category: text(),
  outcome: text(),
  metadata: text({ mode: "json" }).$type<Record<string, unknown>>(),
  ...Timestamps,
}, (table) => [
  index("learning_signal_session_idx").on(table.session_id),
  index("learning_signal_hook_idx").on(table.hook),
  index("learning_signal_skill_idx").on(table.skill_name),
])
