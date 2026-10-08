import z from "zod"
import { and, desc, eq } from "drizzle-orm"
import { Database } from "../storage/db"
import { Identifier } from "../id/id"
import { Bus } from "../bus"
import { BusEvent } from "../bus/bus-event"
import { LearningSignalTable } from "./learning.sql"
import { LearningRouter, type LearningHook, type LearningSignal, type RoutedSkill } from "./router"
import { SkillIndex } from "../skill/index-engine"
import { ReconDispatch } from "../tool/recon-dispatch"
import { ReferenceLearning } from "./reference"
import { SignalQueue } from "../tool/signal-queue"
import { ToolLearning } from "./tool-learning"
import { ReportKnowledge } from "./report-knowledge"
import { Log } from "../util/log"

const sessionRoutes = new Map<string, RoutedSkill[]>()
const sessionNextTools = new Map<string, ReturnType<typeof ReconDispatch.next>>()
const sessionResearch = new Map<string, ReturnType<typeof ReportKnowledge.recommendations>>()
const MAX_SESSION_ROUTES = 256
const MAX_SESSION_CACHE = 256
const log = Log.create({ service: "learning" })

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
          cwe_id: z.string().optional(),
          category: z.string().optional(),
          tags: z.array(z.string()).optional(),
          tech_stack: z.array(z.string()).optional(),
          evidence: z.string().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
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
    let nextTools: ReturnType<typeof ReconDispatch.next> = []

    try {
      await SkillIndex.ensureBuilt()
      routes = LearningRouter.route(signal)
    } catch (error) {
      log.warn("learning router failed", { error: String(error), signal: signal.signal })
    }

    try {
      if (signal.sessionID) {
        const activeAuthorized = signal.metadata?.authorized_active_testing === true
        nextTools = ReconDispatch.next({
          sessionID: signal.sessionID,
          signal: signal.signal,
          target: signal.target,
          authorized_active_testing: activeAuthorized,
        })
      }
    } catch (error) {
      log.warn("recon dispatch failed", { error: String(error), signal: signal.signal })
    }

    const reportID =
      typeof signal.metadata?.report_knowledge_id === "string" ? signal.metadata.report_knowledge_id : undefined
    if (reportID && signal.outcome) {
      const mapped = /duplicate/i.test(signal.outcome)
        ? "duplicate"
        : /rejected|disproven|false/i.test(signal.outcome)
          ? "rejected"
          : /confirmed|approved|finding|useful|validated/i.test(signal.outcome)
            ? "confirmed"
            : "observed"
      ReportKnowledge.recordOutcome({
        reportID,
        sessionID: signal.sessionID,
        outcome: mapped,
        signal: signal.signal,
        evidence: signal.evidence,
        hook: signal.hook,
        metadata: signal.metadata,
      })
    }

    // Public research is advisory knowledge: expose the highest-confidence
    // matching reports to the live session without turning them into findings.
    const researchClass = /^research:([a-z0-9-]+)$/i.exec(signal.signal)?.[1]
    const researchRecommendations = ReportKnowledge.recommendations({
      signal: signal.signal,
      vulnerabilityClass: signal.category ?? researchClass,
      cweID: signal.cwe_id ?? undefined,
      limit: 6,
    })

    if (signal.metadata?.source_tool && signal.outcome) {
      const outcome = /finding|useful|confirmed|validated/i.test(signal.outcome)
        ? "useful"
        : /rejected|disproven|false|duplicate/i.test(signal.outcome)
          ? "rejected"
          : signal.outcome === "empty"
            ? "empty"
            : /cancelled|timed_out|error|failed/i.test(signal.outcome)
              ? "error"
              : undefined
      if (outcome)
        ToolLearning.observe({
          tool: String(signal.metadata.source_tool),
          signal: signal.signal,
          sessionID: signal.sessionID,
          target: signal.target,
          outcome,
          evidence: signal.evidence,
        })
    }

    if (signal.skill_name && signal.outcome) {
      const outcome = /finding|useful|confirmed|validated/i.test(signal.outcome)
        ? "useful"
        : /rejected|disproven|false|duplicate/i.test(signal.outcome)
          ? "rejected"
          : undefined
      if (outcome) ReferenceLearning.recordOutcome(signal.skill_name, outcome, signal.sessionID, signal.evidence)
    }

    if (signal.sessionID) {
      // Coverage is used as a second deterministic learning signal: tools that
      // already covered this exact target/signal are removed from the next plan.
      try {
        const normalized = signal.signal.trim().toLowerCase()
        nextTools = nextTools.filter(
          (tool) =>
            !SignalQueue.alreadyCovered({
              sessionID: signal.sessionID!,
              target: signal.target,
              signal: normalized,
              toolID: tool.id,
            }),
        )
      } catch (error) {
        log.warn("signal coverage check failed", { error: String(error), sessionID: signal.sessionID })
      }

      sessionRoutes.delete(signal.sessionID)
      sessionRoutes.set(signal.sessionID, routes)
      sessionNextTools.delete(signal.sessionID)
      sessionNextTools.set(signal.sessionID, nextTools)
      sessionResearch.delete(signal.sessionID)
      sessionResearch.set(signal.sessionID, researchRecommendations)
      while (sessionRoutes.size > MAX_SESSION_ROUTES) {
        const oldest = sessionRoutes.keys().next().value
        if (!oldest) break
        sessionRoutes.delete(oldest)
        sessionNextTools.delete(oldest)
        sessionResearch.delete(oldest)
      }
      while (sessionNextTools.size > MAX_SESSION_CACHE) {
        const oldest = sessionNextTools.keys().next().value
        if (!oldest) break
        sessionNextTools.delete(oldest)
        sessionRoutes.delete(oldest)
        sessionResearch.delete(oldest)
      }
      while (sessionResearch.size > MAX_SESSION_CACHE) {
        const oldest = sessionResearch.keys().next().value
        if (!oldest) break
        sessionResearch.delete(oldest)
        sessionRoutes.delete(oldest)
        sessionNextTools.delete(oldest)
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
            metadata: {
              ...(signal.metadata ?? {}),
              next_tools: nextTools,
              research_recommendations: researchRecommendations.map((row) => ({
                id: row.id,
                title: row.title,
                vulnerability_class: row.vulnerability_class,
                confidence: row.confidence,
                source_url: row.source_url,
                lesson: row.lesson,
              })),
            },
            time_created: now,
            time_updated: now,
          })
          .run()
      })
    } catch (error) {
      log.warn("learning persistence failed", { error: String(error), sessionID: signal.sessionID })
    }

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
    } catch (error) {
      log.warn("learning event publish failed", { error: String(error), sessionID: signal.sessionID })
    }

    return routes
  }

  export function nextToolsFor(sessionID: string, limit = 8) {
    return (sessionNextTools.get(sessionID) ?? []).slice(0, limit)
  }

  export function routesFor(sessionID: string, limit = 8): RoutedSkill[] {
    return (sessionRoutes.get(sessionID) ?? []).slice(0, limit)
  }

  export function researchFor(sessionID: string, limit = 6) {
    return (sessionResearch.get(sessionID) ?? []).slice(0, limit)
  }

  /**
   * Prime the session with public research knowledge before the first
   * runtime signal arrives. Research sync is intentionally session-agnostic,
   * so the live hunt must hydrate its own advisory cache from persisted
   * knowledge instead of waiting for a later learning signal.
   */
  export function primeResearch(sessionID: string, limit = 6) {
    try {
      const latest = recent({ sessionID, limit: 1 })[0]
      const researchClass = latest?.signal ? /^research:([a-z0-9-]+)$/i.exec(latest.signal)?.[1] : undefined
      const recommendations = ReportKnowledge.recommendations({
        signal: latest?.signal,
        vulnerabilityClass: latest?.category ?? researchClass,
        cweID: undefined,
        limit,
      })
      sessionResearch.delete(sessionID)
      sessionResearch.set(sessionID, recommendations)
      while (sessionResearch.size > MAX_SESSION_CACHE) {
        const oldest = sessionResearch.keys().next().value
        if (!oldest) break
        sessionResearch.delete(oldest)
      }
      return recommendations
    } catch (error) {
      log.warn("research session hydration failed", { error: String(error), sessionID })
      return []
    }
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
