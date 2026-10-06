import z from "zod"
import { and, desc, eq } from "drizzle-orm"
import { Database } from "../storage/db"
import { Identifier } from "../id/id"
import { Bus } from "../bus"
import { BusEvent } from "../bus/bus-event"
import { LearningSignalTable } from "./learning.sql"
import { LearningRouter, type LearningHook, type LearningSignal, type RoutedSkill } from "./router"
import { SkillIndex } from "../skill/index-engine"

export namespace Learning {
  export const Event = {
    Signal: BusEvent.define(
      "learning.signal",
      z.object({
        signal: z.object({
          sessionID: z.string().optional(),
          hook: z.string(),
          signal: z.string(),
          skill_name: z.string().optional(),
          target: z.string().optional(),
          agent: z.string().optional(),
          outcome: z.string().optional(),
        }),
        routes: z.array(
          z.object({
            name: z.string(),
            score: z.number(),
            reasons: z.array(z.string()),
          }),
        ),
      }),
    ),
  }

  export function isHook(value: string): value is LearningHook {
    return (
      value === "before_recon" ||
      value === "during_testing" ||
      value === "after_finding" ||
      value === "after_triage" ||
      value === "before_summary"
    )
  }

  export async function emit(signal: LearningSignal): Promise<RoutedSkill[]> {
    let routes: RoutedSkill[] = []

    try {
      await SkillIndex.ensureBuilt()
      routes = LearningRouter.route(signal)
    } catch {}

    const now = Date.now()

    try {
      Database.use((db) => {
        db.insert(LearningSignalTable)
          .values({
            id: Identifier.ascending("learning_signal"),
            session_id: signal.sessionID,
            hook: signal.hook,
            signal: signal.signal,
            skill_name: signal.skill_name,
            agent: signal.agent,
            target: signal.target,
            category: signal.category,
            outcome: signal.outcome,
            metadata: signal.metadata,
            time_created: now,
            time_updated: now,
          })
          .run()
      })
    } catch {}

    try {
      await Bus.publish(Event.Signal, {
        signal: {
          sessionID: signal.sessionID,
          hook: signal.hook,
          signal: signal.signal,
          skill_name: signal.skill_name,
          target: signal.target,
          agent: signal.agent,
          outcome: signal.outcome,
        },
        routes,
      })
    } catch {}

    return routes
  }

  export function recent(input?: { sessionID?: string; hook?: LearningHook; limit?: number }) {
    const limit = input?.limit ?? 50
    return Database.use((db) => {
      const conditions = []
      if (input?.sessionID) conditions.push(eq(LearningSignalTable.session_id, input.sessionID))
      if (input?.hook) conditions.push(eq(LearningSignalTable.hook, input.hook))
      const query = db.select().from(LearningSignalTable)
      if (conditions.length === 0) {
        return query.orderBy(desc(LearningSignalTable.time_created)).limit(limit).all()
      }
      return query
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(LearningSignalTable.time_created))
        .limit(limit)
        .all()
    })
  }
}

export type { LearningHook, LearningSignal, RoutedSkill }
