import { describe, expect, test } from "bun:test"
import path from "path"
import { SkillIndex } from "../../src/skill/index-engine"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

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

test("resolves nested skill directory aliases", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const skillDir = path.join(dir, ".cyberstrike", "skill", "category", "directory-skill")
      await Bun.write(
        path.join(skillDir, "SKILL.md"),
        "---\nname: canonical-skill\ndescription: Canonical skill.\n---\n\n# Canonical Skill\n",
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      await SkillIndex.rebuild()
      expect(SkillIndex.get("canonical-skill")?.name).toBe("canonical-skill")
      expect(SkillIndex.get("directory-skill")?.name).toBe("canonical-skill")
    },
  })
})
