import { ToolArtifact } from "./artifact"
import { planReconTools } from "./recon-toolchain"
import { ScopeGuard } from "./scope-check"

export namespace ReconDispatch {
  export type Input = {
    sessionID: string
    signal: string
    target?: string
    scope_items?: string[]
    scope_verified?: boolean
    authorized_active_testing?: boolean
    max_tools?: number
  }

  function key(tool: string, target: string | undefined, signal: string) {
    return tool + "::" + (target ?? "*").trim().toLowerCase() + "::" + signal.trim().toLowerCase()
  }

  /**
   * Gate the planned tool set before anything reaches an execution queue.
   * This module only plans; it never executes commands.
   */
  export function next(input: Input) {
    const planned = planReconTools(input)
    const artifacts = ToolArtifact.list(input.sessionID, 500)
    const seen = new Set(
      artifacts.map((item) => key(item.tool, item.target, item.signal ?? "")),
    )

    const target = input.target
    const scope = target && input.scope_items?.length
      ? ScopeGuard.check(target, input.scope_items)
      : undefined

    const scopeAllowed = input.scope_verified === true || scope?.inScope === true
    const fresh = planned.filter((tool) => {
      if (seen.has(key(tool.id, target, input.signal))) return false

      const active = tool.risk === "active-test" || tool.risk === "high-impact"
      if (active && !scopeAllowed) return false
      if (active && input.authorized_active_testing !== true) return false

      return true
    })

    return fresh.map((tool) => ({
      ...tool,
      scope_verified: scopeAllowed,
      authorization_verified:
        tool.risk !== "active-test" &&
        tool.risk !== "high-impact" ||
        input.authorized_active_testing === true,
    }))
  }
}
