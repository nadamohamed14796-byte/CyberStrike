import { describe, expect, test } from "bun:test"
import { existsSync } from "fs"
import path from "path"

// Reads the real trigger table from the prompt and checks that every skill it
// names exists on disk. A renamed or deleted skill would otherwise stay in the
// prompt and silently never load.
const root = path.join(import.meta.dir, "../../../..")
const prompt = await Bun.file(path.join(import.meta.dir, "../../src/agent/prompt/cyberstrike.txt")).text()
const names = [...prompt.matchAll(/^\| .+ \| ([a-z0-9-]+) \|$/gm)].map((match) => match[1])

describe("skill trigger map", () => {
  test("the table is parsed", () => {
    expect(names.length).toBeGreaterThanOrEqual(15)
  })

  test("every skill named in the table exists", () => {
    const missing = names.filter((name) => !existsSync(path.join(root, ".cyberstrike/skill", name, "SKILL.md")))
    expect(missing).toEqual([])
  })
})
