import { describe, expect, test } from "bun:test"
import { mkdtemp } from "fs/promises"
import os from "os"
import path from "path"
import { add, load, lookup, save, type Entry } from "../../src/finding/fp"

const entry: Entry = {
  fingerprint: "abc123",
  target: "shop.example.com",
  endpoint: "/api/invoices/{id}",
  cls: "idor",
  reason: "invoice belongs to the caller; the API returns the caller's own data",
  evidence: "two accounts, same response body hash",
  date: "2026-10-05",
  confidence: "high",
}

describe("false-positive database", () => {
  test("lookup finds a recorded fingerprint and misses an unknown one", () => {
    const entries = [entry]
    expect(lookup(entries, "abc123")?.reason).toContain("caller")
    expect(lookup(entries, "zzz")).toBeUndefined()
  })

  test("adding the same fingerprint keeps the first record", () => {
    const later = { ...entry, reason: "changed later" }
    const entries = add([entry], later)
    expect(entries).toHaveLength(1)
    expect(entries[0].reason).toBe(entry.reason)
  })

  test("saves to disk and loads back the same records", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "fp-"))
    const file = path.join(dir, "fp.json")
    expect(await load(file)).toEqual([])
    await save(file, [entry])
    expect(await load(file)).toEqual([entry])
  })
})
