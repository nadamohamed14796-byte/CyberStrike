import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { update } from "../../src/learning"

async function fixture(files: Record<string, string>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "writeups-"))
  for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(dir, name), text)
  return dir
}

describe("learning pipeline", () => {
  test("classifies writeups and ranks classes by frequency", async () => {
    const dir = await fixture({
      "a.md": "# IDOR on invoices\nChanging invoice id exposes other users (IDOR).",
      "b.md": "# BOLA in API\nobject reference swap, BOLA on /api/orders.",
      "c.md": "# SSRF via PDF\nserver-side request forgery in the renderer.",
    })
    const { index, briefing } = await update(dir)
    expect(index.count).toBe(3)
    expect(index.classes.idor).toBe(2)
    expect(index.classes.ssrf).toBe(1)
    expect(briefing).toContain("1. idor (2 real cases)")
  })

  test("dedupes identical writeups by content hash", async () => {
    const same = "# XSS in search\ncross-site scripting in q parameter"
    const dir = await fixture({ "one.md": same, "copy.md": same })
    const { index } = await update(dir)
    expect(index.count).toBe(1)
  })

  test("empty folder produces a briefing with no priorities", async () => {
    const dir = await fixture({})
    const { index, briefing } = await update(dir)
    expect(index.count).toBe(0)
    expect(briefing).toContain("No write-ups yet.")
  })
})
