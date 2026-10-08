import { describe, expect, test } from "bun:test"
import path from "path"
import { SkillIndex } from "../../src/skill/index-engine"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

describe("SkillIndex", () => {
  test("tag lookup is case-insensitive", async () => {
    await Instance.provide({
      directory: path.join(__dirname, "../.."),
      fn: async () => {
        await SkillIndex.ensureBuilt()
        const entries = SkillIndex.all()
        expect(entries.length).toBeGreaterThan(0)

        for (const entry of entries.slice(0, 100)) {
          for (const tag of entry.tags) {
            expect(
              SkillIndex.byTag(tag.toUpperCase(), entries.length).some((skill) => skill.name === entry.name),
            ).toBe(true)
          }
        }
      },
    })
  })
})

test("does not leak skills between project instances", async () => {
  await using first = await tmpdir({
    git: true,
    init: async (dir) => {
      const skillDir = path.join(dir, ".cyberstrike", "skill", "isolated-first")
      await Bun.write(
        path.join(skillDir, "SKILL.md"),
        "---\nname: isolated-first\ndescription: First instance skill.\n---\n\n# First Instance Skill\n",
      )
    },
  })
  await using second = await tmpdir({
    git: true,
    init: async (dir) => {
      const skillDir = path.join(dir, ".cyberstrike", "skill", "isolated-second")
      await Bun.write(
        path.join(skillDir, "SKILL.md"),
        "---\nname: isolated-second\ndescription: Second instance skill.\n---\n\n# Second Instance Skill\n",
      )
    },
  })

  await Instance.provide({
    directory: first.path,
    fn: async () => {
      await SkillIndex.rebuild()
      expect(SkillIndex.get("isolated-first")?.name).toBe("isolated-first")
      expect(SkillIndex.get("isolated-second")).toBeUndefined()
    },
  })

  await Instance.provide({
    directory: second.path,
    fn: async () => {
      await SkillIndex.ensureBuilt()
      expect(SkillIndex.get("isolated-second")?.name).toBe("isolated-second")
      expect(SkillIndex.get("isolated-first")).toBeUndefined()
    },
  })
})

test("resolves nested skill directory aliases", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const skillDir = path.join(dir, ".cyberstrike", "skill", "category", "directory-skill")
      await Bun.write(
        path.join(skillDir, "SKILL.md"),
        "---\nname: canonical-skill\ndescription: Canonical skill.\nchains_with:\n  - follow-up-skill\nseverity_boost:\n  follow-up-skill: high\nprerequisites:\n  - prerequisite-skill\n---\n\n# Canonical Skill\n",
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      await SkillIndex.rebuild()
      expect(SkillIndex.get("canonical-skill")?.name).toBe("canonical-skill")
      expect(SkillIndex.get("directory-skill")?.name).toBe("canonical-skill")
      expect(SkillIndex.chainsFrom("directory-skill").map((x) => x.target)).toEqual(["follow-up-skill"])
      expect(SkillIndex.prerequisitesFor("directory-skill")).toEqual(["prerequisite-skill"])
    },
  })
})
