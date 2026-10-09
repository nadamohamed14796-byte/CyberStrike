import { expect, test } from "bun:test"
import { eq } from "drizzle-orm"
import { Database } from "../../src/storage/db"
import { ReferenceLearning } from "../../src/learning/reference"
import { Skill } from "../../src/skill/skill"
import { SkillLearningTable } from "../../src/learning/learning.sql"

test("keeps unscoped skill observations and outcomes separate from session rows", () => {
  const skill: Skill.Info = {
    name: "LearningSessionIsolationSkill",
    description: "Regression fixture for learning session isolation",
    location: "test-fixture",
    content: "# LearningSessionIsolationSkill\n- **Session-scoped observation**\n",
    category: "testing",
    tags: ["learning-audit"],
  }

  ReferenceLearning.observeSkill(skill, "skill-session-alpha")
  ReferenceLearning.observeSkill(skill, "skill-session-beta")
  ReferenceLearning.observeSkill(skill)

  ReferenceLearning.recordOutcome(skill.name, "useful", "skill-session-alpha", "alpha-only evidence")
  ReferenceLearning.recordOutcome(skill.name, "rejected", undefined, "unscoped feedback")

  const rows = Database.use((db) =>
    db.select().from(SkillLearningTable).where(eq(SkillLearningTable.skill_name, skill.name)).all(),
  )
  const alpha = rows.find((row) => row.session_id === "skill-session-alpha")
  const beta = rows.find((row) => row.session_id === "skill-session-beta")
  const unscoped = rows.find((row) => row.session_id === null)

  expect(alpha).toBeDefined()
  expect(beta).toBeDefined()
  expect(unscoped).toBeDefined()
  expect(alpha?.observations).toBe(1)
  expect(alpha?.successes).toBe(1)
  expect(alpha?.rejections).toBe(0)
  expect(beta?.observations).toBe(1)
  expect(beta?.successes).toBe(0)
  expect(beta?.rejections).toBe(0)
  expect(unscoped?.observations).toBe(1)
  expect(unscoped?.successes).toBe(0)
  expect(unscoped?.rejections).toBe(1)
})
