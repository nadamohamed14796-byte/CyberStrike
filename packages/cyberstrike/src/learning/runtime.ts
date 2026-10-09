import path from "path"
import fs from "fs/promises"
import { Database } from "bun:sqlite"

// Runtime learning (spec section 55 and the hook list): what the project has
// learned from its own hunts. Stored per project, separate from the offline
// writeup briefing. Each signal's score is learned from triage outcomes.

export type Outcome = "accepted" | "fp" | "duplicate"

export type Finding = {
  id: string
  title: string
  cls: string
  signals: string[]
  severity: "critical" | "high" | "medium" | "low" | "info"
  status: "candidate" | Outcome
}

export type Stat = { confirmed: number; rejected: number }

export type Store = { signals: Record<string, Stat>; findings: Finding[] }

const empty: Store = { signals: {}, findings: [] }

export function file(directory: string) {
  return path.join(directory, ".cyberstrike", "learning.db")
}

// SQLite, using Bun's built-in driver. Tables are created on first open.
async function open(filepath: string) {
  await fs.mkdir(path.dirname(filepath), { recursive: true })
  const db = new Database(filepath, { create: true })
  db.run("CREATE TABLE IF NOT EXISTS signals (name TEXT PRIMARY KEY, confirmed INTEGER NOT NULL, rejected INTEGER NOT NULL)")
  db.run(
    "CREATE TABLE IF NOT EXISTS findings (id TEXT PRIMARY KEY, title TEXT NOT NULL, cls TEXT NOT NULL, signals TEXT NOT NULL, severity TEXT NOT NULL, status TEXT NOT NULL)",
  )
  return db
}

export async function load(filepath: string): Promise<Store> {
  const db = await open(filepath)
  const signals = db.query("SELECT name, confirmed, rejected FROM signals").all() as {
    name: string
    confirmed: number
    rejected: number
  }[]
  const findings = db.query("SELECT id, title, cls, signals, severity, status FROM findings").all() as {
    id: string
    title: string
    cls: string
    signals: string
    severity: Finding["severity"]
    status: Finding["status"]
  }[]
  db.close()
  return {
    signals: Object.fromEntries(signals.map((row) => [row.name, { confirmed: row.confirmed, rejected: row.rejected }])),
    findings: findings.map((row) => ({ ...row, signals: JSON.parse(row.signals) as string[] })),
  }
}

// Replaces the stored state in one transaction, so a failed write leaves the
// previous state intact.
export async function save(filepath: string, store: Store) {
  const db = await open(filepath)
  const write = db.transaction(() => {
    db.run("DELETE FROM signals")
    db.run("DELETE FROM findings")
    for (const [name, stat] of Object.entries(store.signals))
      db.run("INSERT INTO signals (name, confirmed, rejected) VALUES (?, ?, ?)", [name, stat.confirmed, stat.rejected])
    for (const finding of store.findings)
      db.run("INSERT INTO findings (id, title, cls, signals, severity, status) VALUES (?, ?, ?, ?, ?, ?)", [
        finding.id,
        finding.title,
        finding.cls,
        JSON.stringify(finding.signals),
        finding.severity,
        finding.status,
      ])
  })
  write()
  db.close()
}

// during_testing: a 0-10 score for a signal from how often it led to accepted
// findings versus false positives or duplicates. Unseen signals start at 5.
export function score(store: Store, signal: string) {
  const stat = store.signals[signal]
  if (!stat) return 5
  const rate = (stat.confirmed + 1) / (stat.confirmed + stat.rejected + 2)
  return Math.min(10, Math.max(0, Math.round(rate * 10)))
}

// after_finding: record a candidate. A finding id that already exists is kept
// as it was, so a repeat report does not reset its triage.
export function addFinding(store: Store, finding: Omit<Finding, "status">): Store {
  if (store.findings.some((f) => f.id === finding.id)) return store
  return { ...store, findings: [...store.findings, { ...finding, status: "candidate" }] }
}

// after_triage: apply the outcome and update each linked signal's counts.
// A finding can be triaged once; a second call is ignored.
export function triage(store: Store, id: string, outcome: Outcome): Store {
  const finding = store.findings.find((f) => f.id === id)
  if (!finding || finding.status !== "candidate") return store
  const signals = { ...store.signals }
  for (const signal of finding.signals) {
    const stat = signals[signal] ?? { confirmed: 0, rejected: 0 }
    signals[signal] = outcome === "accepted" ? { ...stat, confirmed: stat.confirmed + 1 } : { ...stat, rejected: stat.rejected + 1 }
  }
  const findings = store.findings.map((f) => (f.id === id ? { ...f, status: outcome } : f))
  return { signals, findings }
}

// before_recon: the signals this project has learned about, highest score first.
// Ties keep the order the signals were first seen.
export function plan(store: Store) {
  return Object.keys(store.signals)
    .map((signal) => ({ signal, score: score(store, signal) }))
    .toSorted((a, b) => b.score - a.score)
}

const rank = { accepted: 0, candidate: 1, duplicate: 2, fp: 3 } as const
const severityRank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 } as const

// before_summary: accepted findings first, then by severity.
export function ranked(store: Store) {
  return store.findings
    .filter((f) => f.status !== "fp" && f.status !== "duplicate")
    .toSorted((a, b) => rank[a.status] - rank[b.status] || severityRank[a.severity] - severityRank[b.severity])
}
