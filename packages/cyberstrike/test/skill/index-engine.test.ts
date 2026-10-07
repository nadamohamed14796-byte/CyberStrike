import { describe, expect, test } from "bun:test"
import { SkillIndex } from "../../src/skill/index-engine"

describe("SkillIndex", () => {
  test("tag lookup is case-insensitive", async () => {
    await SkillIndex.ensureBuilt()
    const entries = SkillIndex.all()
    expect(entries.length).toBeGreaterThan(0)

    for (const entry of entries.slice(0, 100)) {
      for (const tag of entry.tags) {
        expect(SkillIndex.byTag(tag.toUpperCase()).some((skill) => skill.name === entry.name)).toBe(true)
      }
    }
  })
})
