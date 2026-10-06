import z from "zod"
import { and, desc, eq } from "drizzle-orm"
import { Database } from "../storage/db"
import { Identifier } from "../id/id"
import { Bus } from "../bus"
import { BusEvent } from "../bus/bus-event"
import { LearningSignalTable } from "./learning.sql"
import { LearningRouter, type LearningHook, type LearningSignal, type RoutedSkill } from "./router"
import { SkillIndex } from "../skill/index-engine"
import { planReconTools } from "../tool/recon-toolchain"

const sessionRoutes = new Map<string, RoutedSkill[]>()
const MAX_SESSION_ROUTES = 256

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
    let nextTools: ReturnType<typeof planReconTools> = []

    try {
      await SkillIndex.ensureBuilt()
      routes = LearningRouter.route(signal)
    } catch {}

    try {
      const activeAuthorized = signal.metadata?.authorized_active_testing === true
      nextTools = planReconTools({
        signal: signal.signal,
        target: signal.target,
        authorized_active_testing: activeAuthorized,
      })
    } catch {}

    if (signal.sessionID) {
      sessionRoutes.delete(signal.sessionID)
      sessionRoutes.set(signal.sessionID, routes)
      while (sessionRoutes.size > MAX_SESSION_ROUTES) {
        const oldest = sessionRoutes.keys().next().value
        if (!oldest) break
        sessionRoutes.delete(oldest)
      }
    }

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
            metadata: { ...(signal.metadata ?? {}), next_tools: nextTools },
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
          metadata: { ...(signal.metadata ?? {}), next_tools: nextTools },
        },
        routes,
      })
    } catch {}

    return routes
  }

  export function routesFor(sessionID: string, limit = 8): RoutedSkill[] {
    return (sessionRoutes.get(sessionID) ?? []).slice(0, limit)
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
