import z from "zod"
import { Tool } from "./tool"
import { ScopeGuard } from "./scope-guard"

export { ScopeGuard, type ScopeMatch } from "./scope-guard"

export const ScopeCheckTool = Tool.define("scope_check", {
  description:
    "Validate that a target is in scope before testing. Supports exact host match, wildcard domains (*.example.com), URL paths/ports, and IPv4 CIDR ranges. Always check scope before actively testing a new target to avoid scope violations.",
  parameters: z.object({
    target: z.string().describe("The target to check (domain, IP, or URL)"),
    scope_items: z
      .array(z.string())
      .describe(
        "List of in-scope items (domains, wildcards like *.example.com, URL paths/ports, CIDRs like 10.0.0.0/24)",
      ),
  }),
  async execute(params) {
    const target = params.target.toLowerCase().trim()
    const { inScope, results } = ScopeGuard.check(target, params.scope_items)

    const output = [
      `Target: ${target}`,
      `In scope: ${inScope ? "YES" : "NO"}`,
      "",
      "Scope check details:",
      ...results.map((r) => `  ${r.matches ? "[MATCH]" : "[NO]"} ${r.scope} — ${r.reason}`),
    ]

    if (!inScope) {
      output.push("")
      output.push("WARNING: Target is NOT in scope. Do NOT perform active testing on this target.")
    }

    return {
      title: inScope ? `In scope: ${target}` : `OUT OF SCOPE: ${target}`,
      output: output.join("\n"),
      metadata: { target, inScope, results },
    }
  },
})
