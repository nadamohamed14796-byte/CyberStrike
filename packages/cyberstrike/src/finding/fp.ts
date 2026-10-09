import path from "path"
import fs from "fs/promises"
import { Database } from "bun:sqlite"

// False-positive database (spec section 38). Before a lead is investigated
// again, its fingerprint is looked up here. A hit means the same behavior was
// already ruled out, so the agent does not repeat the work.

export type Entry = {
  fingerprint: string
  target: string
  endpoint: string
  cls: string
  reason: string
  evidence: string
  date: string
  confidence: "low" | "medium" | "high"
}

export function lookup(entries: Entry[], fingerprint: string) {
  return entries.find((entry) => entry.fingerprint === fingerprint)
}

// Adding the same fingerprint twice keeps the first record, so the original
// reason and evidence are not overwritten by a later pass.
export function add(entries: Entry[], entry: Entry) {
  if (lookup(entries, entry.fingerprint)) return entries
  return [...entries, entry]
}

// SQLite, stored in the same database file as the runtime learning state.
async function open(filepath: string) {
  await fs.mkdir(path.dirname(filepath), { recursive: true })
  const db = new Database(filepath, { create: true })
  db.run(
    "CREATE TABLE IF NOT EXISTS false_positives (fingerprint TEXT PRIMARY KEY, target TEXT NOT NULL, endpoint TEXT NOT NULL, cls TEXT NOT NULL, reason TEXT NOT NULL, evidence TEXT NOT NULL, date TEXT NOT NULL, confidence TEXT NOT NULL)",
  )
  return db
}

export async function load(filepath: string) {
  const db = await open(filepath)
  const rows = db.query("SELECT * FROM false_positives ORDER BY rowid").all() as Entry[]
  db.close()
  return rows
}

// Replaces the stored entries in one transaction.
export async function save(filepath: string, entries: Entry[]) {
  const db = await open(filepath)
  const write = db.transaction(() => {
    db.run("DELETE FROM false_positives")
    for (const entry of entries)
      db.run(
        "INSERT INTO false_positives (fingerprint, target, endpoint, cls, reason, evidence, date, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [entry.fingerprint, entry.target, entry.endpoint, entry.cls, entry.reason, entry.evidence, entry.date, entry.confidence],
      )
  })
  write()
  db.close()
}
