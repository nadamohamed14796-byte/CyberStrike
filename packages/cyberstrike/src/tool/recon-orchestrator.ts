import type { PlannedReconTool } from "./recon-toolchain-plan"

type ReconOrchestratorMetadata = {
  status: "empty" | "planned"
  queue_id?: string
  signal?: string
  target?: string
  tools: PlannedReconTool[]
}

import z from "zod"
import { Tool } from "./tool"
import { SignalQueue } from "./signal-queue"

export const ReconOrchestratorTool = Tool.define("recon_orchestrator", {
  description:
    "Drive the persistent signal queue one step at a time. Select the highest-priority pending signal, apply scope and active-testing authorization gates, and return the allowed next tools. This tool plans orchestration only; it never executes shell commands or high-impact testing.",
  parameters: z.object({
    sessionID: z.string().min(1),
    scope_items: z.array(z.string()).default([]),
    scope_verified: z.boolean().default(false),
    authorized_active_testing: z.boolean().default(false),
    max_tools: z.number().int().min(1).max(8).default(3),
  }),
  async execute(params): Promise<{ title: string; output: string; metadata: ReconOrchestratorMetadata }> {
    const planned = SignalQueue.planNext({
      sessionID: params.sessionID,
      scope_items: params.scope_items,
      scope_verified: params.scope_verified,
      authorized_active_testing: params.authorized_active_testing,
      max_tools: params.max_tools,
    })

    if (!planned) {
      return {
        title: "Recon queue: empty",
        output: "No pending signals remain for this session.",
        metadata: {
          status: "empty",
          queue_id: undefined,
          signal: undefined,
          target: undefined,
          tools: [],
        } as ReconOrchestratorMetadata,
      }
    }

    return {
      title: "Recon queue: " + planned.queue.signal,
      output: [
        "SIGNAL",
        planned.queue.signal,
        "",
        "TARGET",
        planned.queue.target ?? "*",
        "",
        "QUEUE",
        "id=" + planned.queue.id,
        "priority=" + planned.queue.priority,
        "depth=" + planned.queue.depth,
        "attempts=" + planned.queue.attempts + "/" + planned.queue.max_attempts,
        "status=" + planned.queue.status,
        "",
        "ALLOWED NEXT TOOLS",
        ...planned.tools.map(
          (tool, i) =>
            i +
            1 +
            ". " +
            tool.id +
            " | phase=" +
            tool.phase +
            " | risk=" +
            tool.risk +
            " | scope=" +
            (tool.scope_verified ? "verified" : "not-verified") +
            " | authorization=" +
            (tool.authorization_verified ? "verified" : "not-required"),
        ),
        "",
        "The orchestrator does not execute these tools. Execute only through the normal tool permission/scope path.",
      ].join("\n"),
      metadata: {
        status: "planned",
        queue_id: planned.queue.id,
        signal: planned.queue.signal,
        target: planned.queue.target,
        tools: planned.tools,
      } as ReconOrchestratorMetadata,
    }
  },
})
