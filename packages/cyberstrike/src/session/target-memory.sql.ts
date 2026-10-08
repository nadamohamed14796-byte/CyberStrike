import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core"
import { ProjectTable } from "../project/project.sql"
import { Timestamps } from "../storage/schema.sql"

export const TargetMemoryTable = sqliteTable(
  "target_memory",
  {
    id: text().primaryKey(),
    project_id: text()
      .notNull()
      .references(() => ProjectTable.id, { onDelete: "cascade" }),
    kind: text().notNull(), // endpoint | javascript
    asset: text().notNull(),
    method: text(),
    url: text().notNull(),
    request_id: text(),
    page_url: text(),
    content_type: text(),
    content: text(),
    metadata: text({ mode: "json" }).$type<Record<string, unknown>>(),
    ...Timestamps,
  },
  (table) => [
    uniqueIndex("target_memory_unique_idx").on(table.project_id, table.kind, table.method, table.url),
    index("target_memory_project_idx").on(table.project_id),
    index("target_memory_asset_idx").on(table.project_id, table.asset),
    index("target_memory_kind_idx").on(table.project_id, table.kind),
  ],
)
