import { ToolArtifact } from "./artifact"
import { planReconTools } from "./recon-toolchain"

export namespace ReconDispatch {
  export type Input = {
    sessionID: string
    signal: string
    target?: string
    authorized_active_testing?: boolean
    max_tools?: number
  }

  function key(tool: string, target: string | undefined, signal: string) {
    return tool + "::" + (target ?? "*").trim().toLowerCase() + "::" + signal.trim().toLowerCase()
  }

  /**
   * Plan only tools that have not already produced an artifact for the same
   * session/target. This is an anti-loop guard, not an execution engine.
   */
  export function next(input: Input) {
    const planned = planReconTools(input)
    const artifacts = ToolArtifact.list(input.sessionID, 500)
    const seen = new Set(
      artifacts.map((item) => key(item.tool, item.target)),
    )
    const target = input.target
    const fresh = planned.filter((tool) => !seen.has(key(tool.id, target, input.signal)))
    return fresh.length > 0 ? fresh : []
  }
}
