import { eq, and, desc, isNull } from "drizzle-orm"
import { Database } from "../storage/db"
import { Identifier } from "../id/id"
import { SkillLearningEventTable, SkillLearningTable } from "./learning.sql"
import { Skill } from "../skill/skill"

export namespace ReferenceLearning {
  function concepts(content: string): string[] {
    return Array.from(
      new Set(
        content
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => /^#{1,4}\s|^- \*\*/.test(line))
          .map((line) =>
            line
              .replace(/^#{1,4}\s+|^- \*\*/g, "")
              .trim()
              .toLowerCase(),
          )
          .filter((line) => line.length >= 4 && line.length <= 120),
      ),
    ).slice(0, 40)
  }

  export function observeSkill(skill: Skill.Info, sessionID?: string): void {
    try {
      const now = Date.now()
      const learned = concepts(skill.content)
      const sourceMatch = skill.content.match(/(?:^|\n)Source:\s*(\S+)/i)
      const source = sourceMatch?.[1] ?? skill.author ?? skill.verified ?? "reference"

      Database.transaction((db) => {
        const where = sessionID
          ? and(eq(SkillLearningTable.session_id, sessionID), eq(SkillLearningTable.skill_name, skill.name))
          : and(isNull(SkillLearningTable.session_id), eq(SkillLearningTable.skill_name, skill.name))

        const existing = db.select().from(SkillLearningTable).where(where).get()

        if (existing) {
          db.update(SkillLearningTable)
            .set({
              observations: existing.observations + 1,
              concepts: learned,
              source,
              // An observed skill with no outcome history should remain neutral,
              // not be ranked as useless merely because feedback is absent.
              usefulness: existing.successes + existing.rejections === 0 ? 50 : existing.usefulness,
              category: skill.category,
              tags: skill.tags ?? [],
              last_used_at: now,
              time_updated: now,
            })
            .where(eq(SkillLearningTable.id, existing.id))
            .run()
        } else {
          db.insert(SkillLearningTable)
            .values({
              id: Identifier.ascending("skill_learning"),
              session_id: sessionID,
              skill_name: skill.name,
              source,
              category: skill.category,
              tags: skill.tags ?? [],
              concepts: learned,
              observations: 1,
              usefulness: 50,
              last_used_at: now,
              time_created: now,
              time_updated: now,
            })
            .run()
        }

        db.insert(SkillLearningEventTable)
          .values({
            id: Identifier.ascending("skill_learning_event"),
            session_id: sessionID,
            skill_name: skill.name,
            event: "loaded",
            concepts: learned,
            evidence: "Reference skill loaded into context",
            time_created: now,
            time_updated: now,
          })
          .run()
      })
    } catch {
      // Learning is telemetry; a missing/outdated local DB must never block skill loading.
    }
  }

  export function recordOutcome(
    skillName: string,
    outcome: "useful" | "finding" | "rejected" | "disproven",
    sessionID?: string,
    evidence?: string,
  ): void {
    try {
      const now = Date.now()
      Database.transaction((db) => {
        const where = sessionID
          ? and(eq(SkillLearningTable.session_id, sessionID), eq(SkillLearningTable.skill_name, skillName))
          : and(isNull(SkillLearningTable.session_id), eq(SkillLearningTable.skill_name, skillName))

        const row = db.select().from(SkillLearningTable).where(where).get()
        if (!row) return

        const successes = row.successes + (outcome === "useful" || outcome === "finding" ? 1 : 0)
        const rejections = row.rejections + (outcome === "rejected" || outcome === "disproven" ? 1 : 0)
        const usefulness = Math.round((successes / Math.max(1, successes + rejections)) * 100)

        db.update(SkillLearningTable)
          .set({ successes, rejections, usefulness, time_updated: now })
          .where(eq(SkillLearningTable.id, row.id))
          .run()

        db.insert(SkillLearningEventTable)
          .values({
            id: Identifier.ascending("skill_learning_event"),
            session_id: sessionID,
            skill_name: skillName,
            event: outcome,
            outcome,
            evidence,
            time_created: now,
            time_updated: now,
          })
          .run()
      })
    } catch {
      // Learning is telemetry; an unavailable DB must never block security testing.
    }
  }

  export function score(skillName: string, sessionID?: string): number {
    try {
      return Database.use((db) => {
        if (sessionID) {
          const where = and(eq(SkillLearningTable.session_id, sessionID), eq(SkillLearningTable.skill_name, skillName))
          const row = db.select().from(SkillLearningTable).where(where).get()
          if (!row || row.successes + row.rejections === 0) return 50
          return Math.round((row.successes / (row.successes + row.rejections)) * 100)
        }

        // Cross-session score: aggregate actual outcomes instead of reading one arbitrary session row.
        const rows = db.select().from(SkillLearningTable).where(eq(SkillLearningTable.skill_name, skillName)).all()
        let successes = 0
        let rejections = 0
        for (const row of rows) {
          successes += row.successes
          rejections += row.rejections
        }
        if (successes + rejections === 0) return 50
        return Math.round((successes / (successes + rejections)) * 100)
      })
    } catch {
      return 50
    }
  }

  export function top(limit = 10) {
    try {
      return Database.use((db) =>
        db
          .select({
            skill: SkillLearningTable.skill_name,
            usefulness: SkillLearningTable.usefulness,
            observations: SkillLearningTable.observations,
          })
          .from(SkillLearningTable)
          .orderBy(desc(SkillLearningTable.usefulness), desc(SkillLearningTable.observations))
          .limit(limit)
          .all(),
      )
    } catch {
      return []
    }
  }

  export function recent(limit = 20) {
    try {
      return Database.use((db) =>
        db
          .select({
            skill: SkillLearningEventTable.skill_name,
            outcome: SkillLearningEventTable.event,
            evidence: SkillLearningEventTable.evidence,
          })
          .from(SkillLearningEventTable)
          .orderBy(desc(SkillLearningEventTable.time_created))
          .limit(limit)
          .all(),
      )
    } catch {
      return []
    }
  }
}
