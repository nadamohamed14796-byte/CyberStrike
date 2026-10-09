import { expect, test } from "bun:test"
import { eq } from "drizzle-orm"
import { Database } from "../../src/storage/db"
import { ReferenceLearning } from "../../src/learning/reference"
import { Skill } from "../../src/skill/skill"
import { SkillLearningTable } from "../../src/learning/learning.sql"
import { createLearningTestSessions } from "./test-session"

test("keeps unscoped skill observations and outcomes separate from session rows", () => {
  const sessions = createLearningTestSessions("reference-learning", ["alpha", "beta"])
  const skill: Skill.Info = {
    name: "LearningSessionIsolationSkill",
    description: "Regression fixture for learning session isolation",
    location: "test-fixture",
    content: "# LearningSessionIsolationSkill\n- **Session-scoped observation**\n",
    category: "testing",
    tags: ["learning-audit"],
  }

  ReferenceLearning.observeSkill(skill, sessions.alpha)
  ReferenceLearning.observeSkill(skill, sessions.beta)
  ReferenceLearning.observeSkill(skill)

  expect(ReferenceLearning.score(skill.name, sessions.alpha)).toBe(50)
  expect(ReferenceLearning.score(skill.name, sessions.beta)).toBe(50)
  expect(ReferenceLearning.score(skill.name)).toBe(50)

  ReferenceLearning.recordOutcome(skill.name, "useful", sessions.alpha, "alpha-only evidence")
  ReferenceLearning.recordOutcome(skill.name, "rejected", undefined, "unscoped feedback")

  const rows = Database.use((db) =>
    db.select().from(SkillLearningTable).where(eq(SkillLearningTable.skill_name, skill.name)).all(),
  )
  const alpha = rows.find((row) => row.session_id === sessions.alpha)
  const beta = rows.find((row) => row.session_id === sessions.beta)
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
  expect(ReferenceLearning.score(skill.name, sessions.alpha)).toBe(100)
  expect(ReferenceLearning.score(skill.name, sessions.beta)).toBe(50)
  expect(ReferenceLearning.score(skill.name)).toBe(50)
})
