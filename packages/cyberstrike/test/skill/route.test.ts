import { describe, expect, test } from "bun:test"
import { existsSync } from "fs"
import path from "path"
import { SIGNALS, route } from "../../src/skill/route"

const root = path.join(import.meta.dir, "../../../..")
const prompt = await Bun.file(path.join(import.meta.dir, "../../src/agent/prompt/cyberstrike.txt")).text()
const promptSkills = [...prompt.matchAll(/^\| .+ \| ([a-z0-9-]+) \|$/gm)].map((match) => match[1])

describe("signal routing", () => {
  test("a known signal routes to its skill", () => {
    expect(route(["jwt_detected"])).toEqual(["attack-jwt"])
  })

  test("an unknown signal routes to nothing", () => {
    expect(route(["something_new"])).toEqual([])
  })

  test("repeated skills are returned once", () => {
    expect(route(["jwt_detected", "jwt_detected"])).toEqual(["attack-jwt"])
  })

  test("every routed skill exists on disk", () => {
    const targets = [...new Set(Object.values(SIGNALS).flat())]
    const missing = targets.filter((name) => !existsSync(path.join(root, ".cyberstrike/skill", name, "SKILL.md")))
    expect(missing).toEqual([])
  })

  test("the router and the prompt trigger table name the same skills", () => {
    const fromCode = [...new Set(Object.values(SIGNALS).flat())].sort()
    const fromPrompt = [...new Set(promptSkills)].sort()
    expect(fromCode).toEqual(fromPrompt)
  })
})
