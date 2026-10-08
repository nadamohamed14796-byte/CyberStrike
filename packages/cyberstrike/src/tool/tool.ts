import z from "zod"
import type { MessageV2 } from "../session/message-v2"
import type { Agent } from "../agent/agent"
import type { PermissionNext } from "../permission/next"
import { Truncate } from "./truncation"
import { ToolRunRecord } from "./run-record"
import { ToolArtifact } from "./artifact"
import { TargetMemory } from "../session/target-memory"
import { ingestParameterDiscovery } from "../methodology/parameter-ingest"
import { Log } from "../util/log"

const log = Log.create({ service: "tool" })

export namespace Tool {
  interface Metadata {
    [key: string]: any
  }

  export interface InitContext {
    agent?: Agent.Info
  }

  export type Context<M extends Metadata = Metadata> = {
    sessionID: string
    messageID: string
    agent: string
    abort: AbortSignal
    callID?: string
    extra?: { [key: string]: any }
    messages: MessageV2.WithParts[]
    metadata(input: { title?: string; metadata?: M }): void
    ask(input: Omit<PermissionNext.Request, "id" | "sessionID" | "tool">): Promise<void>
  }
  export interface Info<Parameters extends z.ZodType = z.ZodType, M extends Metadata = Metadata> {
    id: string
    init: (ctx?: InitContext) => Promise<{
      description: string
      parameters: Parameters
      execute(
        args: z.infer<Parameters>,
        ctx: Context,
      ): Promise<{
        title: string
        metadata: M
        output: string
        attachments?: MessageV2.FilePart[]
      }>
      formatValidationError?(error: z.ZodError): string
    }>
  }

  export type InferParameters<T extends Info> = T extends Info<infer P> ? z.infer<P> : never
  export type InferMetadata<T extends Info> = T extends Info<any, infer M> ? M : never

  function executionIdentity(args: unknown) {
    if (!args || typeof args !== "object" || Array.isArray(args)) return {}
    const value = args as Record<string, unknown>
    const target =
      typeof value.target === "string"
        ? value.target
        : value.target && typeof value.target === "object" && typeof (value.target as Record<string, unknown>).url === "string"
          ? String((value.target as Record<string, unknown>).url)
          : typeof value.url === "string"
            ? value.url
            : undefined
    const endpoint =
      typeof value.endpoint === "string"
        ? value.endpoint
        : typeof target === "string" && /^https?:\/\//i.test(target)
          ? target
          : undefined
    return { target, endpoint }
  }

  async function verifyExecutionScope(args: unknown): Promise<boolean | undefined> {
    if (!args || typeof args !== "object" || Array.isArray(args)) return undefined
    const value = args as Record<string, unknown>
    const items = Array.isArray(value.scope_items) ? value.scope_items.filter((x): x is string => typeof x === "string") : []
    const identity = executionIdentity(args)
    if (!identity.target) return typeof value.scope_verified === "boolean" ? value.scope_verified : undefined
    if (!items.length) {
      if (value.authorized_active_testing === true) {
        throw new Error("Active testing requires explicit scope_items; scope_verified cannot substitute for the programmatic scope check.")
      }
      return undefined
    }
    const { ScopeGuard } = await import("./scope-guard")
    const decision = ScopeGuard.check(identity.target, items)
    if (!decision.inScope) throw new Error(`Out-of-scope execution refused for target "${identity.target}".`)
    return true
  }

  export function define<Parameters extends z.ZodType, Result extends Metadata>(
    id: string,
    init: Info<Parameters, Result>["init"] | Awaited<ReturnType<Info<Parameters, Result>["init"]>>,
  ): Info<Parameters, Result> {
    return {
      id,
      init: async (initCtx) => {
        const toolInfo = init instanceof Function ? await init(initCtx) : init
        const execute = toolInfo.execute
        toolInfo.execute = async (args, ctx) => {
          try {
            toolInfo.parameters.parse(args)
          } catch (error) {
            if (error instanceof z.ZodError && toolInfo.formatValidationError) {
              throw new Error(toolInfo.formatValidationError(error), { cause: error })
            }
            throw new Error(
              `The ${id} tool was called with invalid arguments: ${error}.\nPlease rewrite the input so it satisfies the expected schema.`,
              { cause: error },
            )
          }

          const identity = executionIdentity(args)
          const runToolID = id === "external_tool_runner" && typeof args === "object" && args && typeof (args as Record<string, unknown>).tool_id === "string"
            ? String((args as Record<string, unknown>).tool_id)
            : id
          const durableExecution = Boolean(ctx.sessionID && ctx.extra?.model)
          let scopeVerified: boolean | undefined
          let run: ReturnType<typeof ToolRunRecord.begin> | undefined

          try {
            scopeVerified = await verifyExecutionScope(args)
            if (durableExecution) {
              run = ToolRunRecord.begin({
              sessionID: ctx.sessionID,
              toolID: runToolID,
              toolName: runToolID,
              target: identity.target,
              endpoint: identity.endpoint,
              parameters: args as Record<string, unknown>,
              callID: ctx.callID,
              scopeVerified,
              agent: ctx.agent,
                metadata: { messageID: ctx.messageID },
              })
            }

            if (run?.deduplicated) {
              return {
                title: `Skipped duplicate execution: ${id}`,
                output: `An equivalent ${id} execution is already running (run ${run.id}).`,
                metadata: {
                  truncated: false,
                  deduplicated: true,
                  ...(run ? { runID: run.id, runKey: run.runKey } : {}),
                  scopeVerified,
                } as unknown as Result,
              }
            }

            const result = await execute(args, ctx)
            const aborted = ctx.abort.aborted
            const resultMetadata = result.metadata as Record<string, unknown>
            const timedOut =
              resultMetadata.timed_out === true ||
              resultMetadata.timeout === true ||
              (typeof resultMetadata.output === "string" && /terminated .*timeout/i.test(resultMetadata.output))

            if (run) {
              ToolRunRecord.finish({
                id: run.id,
                status: aborted ? "cancelled" : timedOut ? "timed_out" : "completed",
              exitCode: typeof resultMetadata.exit === "number" ? resultMetadata.exit : undefined,
              stdout: typeof resultMetadata.stdout === "string" ? resultMetadata.stdout : undefined,
              stderr: typeof resultMetadata.stderr === "string" ? resultMetadata.stderr : undefined,
              resultSummary: result.output,
                metadata: { ...resultMetadata, scopeVerified },
              })
            }

            try {
              if (ctx.sessionID && identity.target) {
                TargetMemory.rememberDiscovery(ctx.sessionID, {
                  tool: id,
                  output: result.output,
                  signal: `tool:${id}`,
                  callID: ctx.callID,
                })
              }
              ToolArtifact.record({
                sessionID: ctx.sessionID,
                callID: ctx.callID,
                requestID: typeof args === "object" && args && "request_id" in args ? String((args as any).request_id) : undefined,
                credentialID: typeof args === "object" && args && "credential_id" in args ? String((args as any).credential_id) : undefined,
                tool: runToolID,
                target: identity.target,
                input: args,
                output: result.output,
                signal: `tool:${id}:${aborted ? "cancelled" : timedOut ? "timed_out" : "completed"}`,
                metadata: {
                  ...(run ? { runID: run.id, runKey: run.runKey } : {}),
                  scopeVerified,
                  agent: ctx.agent,
                  ...(typeof result.metadata.target_workspace === "string" ? { target_workspace: result.metadata.target_workspace } : {}),
                  ...(typeof result.metadata.session_workspace === "string" ? { session_workspace: result.metadata.session_workspace } : {}),
                },
              })
              const { Learning } = await import("../learning/learning")
              await Learning.emit({
                hook: "during_testing",
                signal: `tool:${id}:${aborted ? "cancelled" : timedOut ? "timed_out" : "completed"}`,
                sessionID: ctx.sessionID,
                target: identity.target,
                agent: ctx.agent,
                outcome: aborted ? "cancelled" : timedOut ? "timed_out" : "completed",
                metadata: {
                  source_tool: runToolID,
                  ...(run ? { tool_run_id: run.id, tool_run_key: run.runKey } : {}),
                  authorized_active_testing: (args as Record<string, unknown>).authorized_active_testing === true,
                },
              })
            } catch (error) {
              log.warn("post-tool persistence failed", { tool: id, sessionID: ctx.sessionID, error: String(error) })
            }
            try {
              ingestParameterDiscovery({
                sessionID: ctx.sessionID,
                tool: id,
                args: args as Record<string, unknown>,
                output: result.output,
              })
            } catch (error) {
              log.warn("parameter ingestion failed", { tool: id, error: String(error) })
            }
            if (result.metadata.truncated !== undefined) {
              return {
                ...result,
                metadata: {
                  ...result.metadata,
                  ...(run ? { runID: run.id, runKey: run.runKey } : {}),
                  scopeVerified,
                },
              }
            }
            const truncated = await Truncate.output(result.output, {}, initCtx?.agent)
            return {
              ...result,
              output: truncated.content,
              metadata: {
                ...result.metadata,
                truncated: truncated.truncated,
                ...(truncated.truncated && { outputPath: truncated.outputPath }),
                ...(run ? { runID: run.id, runKey: run.runKey } : {}),
                scopeVerified,
              },
            }
          } catch (error) {
            if (run) {
              try {
                ToolRunRecord.finish({
                  id: run.id,
                  status: ctx.abort.aborted ? "cancelled" : "failed",
                  error: error instanceof Error ? error.message : String(error),
                  metadata: { scopeVerified },
                })
              } catch (finishError) {
                log.error("failed to persist terminal tool-run state", { tool: id, runID: run.id, error: String(finishError) })
              }
            }
            throw error
          }
        }
        return toolInfo
      },
    }
  }
}
