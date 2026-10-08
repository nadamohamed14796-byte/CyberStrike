import { Database as BunDatabase } from "bun:sqlite"
import { drizzle, type SQLiteBunDatabase } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { type SQLiteTransaction, getTableConfig, SQLiteTable } from "drizzle-orm/sqlite-core"
import { is } from "drizzle-orm"
export * from "drizzle-orm"
import { Context } from "../util/context"
import { lazy } from "../util/lazy"
import { Global } from "../global"
import { Log } from "../util/log"
import { NamedError } from "@cyberstrike-io/util/error"
import z from "zod"
import path from "path"
import { readFileSync, readdirSync } from "fs"
import * as schema from "./schema"

declare const CYBERSTRIKE_MIGRATIONS: { sql: string; timestamp: number; name: string }[] | undefined

export const NotFoundError = NamedError.create(
  "NotFoundError",
  z.object({
    message: z.string(),
  }),
)

const log = Log.create({ service: "db" })

export namespace Database {
  type Schema = typeof schema
  export type Transaction = SQLiteTransaction<"sync", void, Schema>

  type Client = SQLiteBunDatabase<Schema>

  type Journal = { sql: string; timestamp: number; name: string }[]

  function time(tag: string) {
    const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(tag)
    if (!match) return 0
    return Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6]),
    )
  }

  function migrations(dir: string): Journal {
    const dirs = readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

    const sql = dirs
      .map((name) => {
        const file = path.join(dir, name, "migration.sql")
        if (!Bun.file(file).size) return
        const ts = time(name)
        if (ts === 0) {
          throw new Error(
            `Migration folder "${name}" has invalid name. ` +
              `Folder names must start with 14 digits (YYYYMMDDHHmmss). ` +
              `Example: 20260225000000_my-migration`,
          )
        }
        return {
          sql: readFileSync(file, "utf-8"),
          timestamp: ts,
          name,
        }
      })
      .filter(Boolean) as Journal

    return sql.sort((a, b) => a.timestamp - b.timestamp)
  }

  function tableColumns(sqlite: BunDatabase, table: string) {
    const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
    return new Set(rows.map((r) => r.name))
  }

  function tableExists(sqlite: BunDatabase, table: string) {
    const row = sqlite.prepare(`SELECT count(*) as c FROM sqlite_master WHERE type='table' AND name=?`).get(table) as {
      c: number
    } | null
    return (row?.c ?? 0) > 0
  }

  function ensureSignalQueueTable(sqlite: BunDatabase) {
    sqlite.run(`CREATE TABLE IF NOT EXISTS signal_queue (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES session(id) ON DELETE CASCADE,
      parent_id TEXT,
      signal TEXT NOT NULL,
      target TEXT,
      depth INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 1,
      priority INTEGER NOT NULL DEFAULT 50,
      status TEXT NOT NULL DEFAULT 'pending',
      dedup_key TEXT NOT NULL,
      metadata TEXT,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL
    )`)
    sqlite.run("CREATE UNIQUE INDEX IF NOT EXISTS signal_queue_dedup_idx ON signal_queue(session_id, dedup_key)")
    sqlite.run("CREATE INDEX IF NOT EXISTS signal_queue_session_status_idx ON signal_queue(session_id, status)")
    sqlite.run("CREATE INDEX IF NOT EXISTS signal_queue_priority_idx ON signal_queue(priority)")
    sqlite.run("CREATE INDEX IF NOT EXISTS signal_queue_parent_idx ON signal_queue(parent_id)")
  }

  function ensureToolLearningTables(sqlite: BunDatabase) {
    sqlite.run(`CREATE TABLE IF NOT EXISTS tool_learning (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES session(id) ON DELETE CASCADE,
      tool TEXT NOT NULL,
      signal TEXT NOT NULL,
      observations INTEGER NOT NULL DEFAULT 0,
      successes INTEGER NOT NULL DEFAULT 0,
      rejections INTEGER NOT NULL DEFAULT 0,
      usefulness REAL NOT NULL DEFAULT 50,
      last_outcome TEXT,
      last_target TEXT,
      last_evidence TEXT,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL
    )`)
    sqlite.run("CREATE UNIQUE INDEX IF NOT EXISTS tool_learning_session_tool_signal_idx ON tool_learning(session_id, tool, signal)")
    sqlite.run("CREATE INDEX IF NOT EXISTS tool_learning_tool_idx ON tool_learning(tool)")
    sqlite.run("CREATE INDEX IF NOT EXISTS tool_learning_signal_idx ON tool_learning(signal)")
    sqlite.run(`CREATE TABLE IF NOT EXISTS tool_learning_event (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES session(id) ON DELETE CASCADE,
      tool TEXT NOT NULL,
      signal TEXT NOT NULL,
      target TEXT,
      outcome TEXT NOT NULL,
      evidence TEXT,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL
    )`)
    sqlite.run("CREATE INDEX IF NOT EXISTS tool_learning_event_tool_idx ON tool_learning_event(tool)")
    sqlite.run("CREATE INDEX IF NOT EXISTS tool_learning_event_signal_idx ON tool_learning_event(signal)")
    sqlite.run("CREATE INDEX IF NOT EXISTS tool_learning_event_session_idx ON tool_learning_event(session_id)")
  }

  function safeMigrationSQL(sqlite: BunDatabase, sql: string) {
    return sql
      .split(/-->\s*statement-breakpoint/gi)
      .map((statement) => statement.trim())
      .filter(Boolean)
      .filter((statement) => {
        const alter = /^ALTER TABLE [`"]?([A-Za-z0-9_]+)[`"]? ADD COLUMN [`"]?([A-Za-z0-9_]+)[`"]?/i.exec(statement)
        if (!alter) return true
        const [, table, column] = alter
        return !tableExists(sqlite, table) || !tableColumns(sqlite, table).has(column)
      })
      .map((statement) => statement
        .replace(/CREATE TABLE `/g, "CREATE TABLE IF NOT EXISTS `")
        .replace(/CREATE INDEX `/g, "CREATE INDEX IF NOT EXISTS `")
        .replace(/CREATE UNIQUE INDEX `/g, "CREATE UNIQUE INDEX IF NOT EXISTS `")
      )
      .join("\n--> statement-breakpoint\n")
  }
  function reconcile(sqlite: BunDatabase) {
    ensureSignalQueueTable(sqlite)
    ensureToolLearningTables(sqlite)

    // Phase 1: Structural repairs (table reshaping that can't be handled by ADD COLUMN)
    // web_credential: old schema had type/value columns → new schema uses headers JSON
    if (tableExists(sqlite, "web_credential")) {
      const have = tableColumns(sqlite, "web_credential")
      if (have.has("type") && !have.has("headers")) {
        sqlite.run("DROP TABLE IF EXISTS web_credential_new")
        sqlite.run(`CREATE TABLE web_credential_new (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
          label TEXT NOT NULL,
          headers TEXT NOT NULL DEFAULT '{}',
          container_id TEXT,
          role_id TEXT,
          time_created INTEGER NOT NULL,
          time_updated INTEGER NOT NULL
        )`)
        sqlite.run(`INSERT INTO web_credential_new (id, session_id, label, headers, container_id, role_id, time_created, time_updated)
          SELECT id, session_id, label,
            CASE
              WHEN type = 'bearer' OR type = 'jwt' THEN json_object('Authorization', 'Bearer ' || value)
              WHEN type = 'cookie' THEN json_object('Cookie', value)
              WHEN type = 'api_key' THEN json_object('X-API-Key', value)
              WHEN type = 'basic' THEN json_object('Authorization', 'Basic ' || value)
              ELSE json_object('Authorization', value)
            END,
            NULL, role_id, time_created, time_updated
          FROM web_credential`)
        sqlite.run("DROP TABLE web_credential")
        sqlite.run("ALTER TABLE web_credential_new RENAME TO web_credential")
        sqlite.run("CREATE INDEX IF NOT EXISTS web_credential_session_idx ON web_credential(session_id)")
        sqlite.run("CREATE INDEX IF NOT EXISTS web_credential_container_idx ON web_credential(container_id)")
        log.info("reconciled web_credential (type/value → headers)")
      }
    }
    sqlite.run("DROP TABLE IF EXISTS web_credential_new")

    // Phase 2: Schema-driven column reconciliation
    // Drizzle's migrator uses sqlite3_prepare_v2 which only compiles the first SQL statement.
    // Multi-statement migrations without "--> statement-breakpoint" delimiters only ran their
    // first statement. This checks ALL tables against Drizzle schema and adds missing columns.
    const added: string[] = []
    for (const value of Object.values(schema)) {
      if (!is(value, SQLiteTable)) continue
      const config = getTableConfig(value)
      if (!tableExists(sqlite, config.name)) continue
      const have = tableColumns(sqlite, config.name)
      for (const col of config.columns) {
        if (have.has(col.name)) continue
        sqlite.run(`ALTER TABLE ${config.name} ADD COLUMN ${col.name} ${col.getSQLType()}`)
        added.push(`${config.name}.${col.name}`)
      }
    }
    if (added.length) log.info("schema reconciled", { added })
  }

  export const Client = lazy(() => {
    log.info("opening database", { path: path.join(Global.Path.data, "cyberstrike.db") })

    const sqlite = new BunDatabase(path.join(Global.Path.data, "cyberstrike.db"), { create: true })

    sqlite.run("PRAGMA journal_mode = WAL")
    sqlite.run("PRAGMA synchronous = NORMAL")
    sqlite.run("PRAGMA busy_timeout = 5000")
    sqlite.run("PRAGMA cache_size = -64000")
    sqlite.run("PRAGMA foreign_keys = ON")
    sqlite.run("PRAGMA wal_checkpoint(PASSIVE)")

    const db = drizzle({ client: sqlite, schema })

    // Apply schema migrations
    const entries =
      typeof CYBERSTRIKE_MIGRATIONS !== "undefined"
        ? CYBERSTRIKE_MIGRATIONS
        : migrations(path.join(import.meta.dirname, "../../migration"))
    if (entries.length > 0) {
      log.info("applying migrations", {
        count: entries.length,
        mode: typeof CYBERSTRIKE_MIGRATIONS !== "undefined" ? "bundled" : "dev",
      })
      // Make migration statements idempotent when the journal is missing but the DB survives.
      // SQLite does not support ALTER TABLE ADD COLUMN IF NOT EXISTS, so skip already-present columns.
      const safe = entries.map((e) => ({ ...e, sql: safeMigrationSQL(sqlite, e.sql) }))
      migrate(db, safe)
    }

    // Reconcile schema: ensures all tables have all expected columns.
    // Handles partially applied migrations (Drizzle's sqlite3_prepare_v2 only runs the first
    // statement when "--> statement-breakpoint" delimiters are missing) and any future drift.
    reconcile(sqlite)

    return db
  })

  export type TxOrDb = Transaction | Client

  const ctx = Context.create<{
    tx: TxOrDb
    effects: (() => void | Promise<void>)[]
  }>("database")

  export function use<T>(callback: (trx: TxOrDb) => T): T {
    try {
      return callback(ctx.use().tx)
    } catch (err) {
      if (err instanceof Context.NotFound) {
        const effects: (() => void | Promise<void>)[] = []
        const result = ctx.provide({ effects, tx: Client() }, () => callback(Client()))
        for (const effect of effects) effect()
        return result
      }
      throw err
    }
  }

  export function effect(fn: () => any | Promise<any>) {
    try {
      ctx.use().effects.push(fn)
    } catch {
      fn()
    }
  }

  export function transaction<T>(callback: (tx: TxOrDb) => T): T {
    try {
      return callback(ctx.use().tx)
    } catch (err) {
      if (err instanceof Context.NotFound) {
        const effects: (() => void | Promise<void>)[] = []
        const result = (Client() as any).transaction((tx: any) => ctx.provide({ tx, effects }, () => callback(tx))) as T
        for (const effect of effects) effect()
        return result
      }
      throw err
    }
  }
}
