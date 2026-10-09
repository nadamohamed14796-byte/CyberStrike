import z from "zod"
import { Tool } from "./tool"
import { ScopeGuard } from "./scope-guard"

export { ScopeGuard, type ScopeMatch, type ScopePolicy, type ScopePolicyDecision } from "./scope-guard"

export const ScopeCheckTool = Tool.define("scope_check", {
  description:
    "Check authorization before testing. Supports exact hosts/domains, wildcards (*.example.com matches the root and subdomains), HTTP(S) scheme/port/path, IPv4/IPv6 literals and CIDRs, and !pattern exclusions (exclusions always win). Optional policy fields keep open-scope report eligibility separate from permission to actively test an unlisted asset.",
  parameters: z.object({
    target: z.string().describe("Target domain, hostname, IP address, or HTTP(S) URL"),
    scope_items: z.array(z.string()).describe(
      "Program scope patterns: example.com, *.example.com, https://example.com:8443/api, 192.0.2.0/24, 2001:db8::/32; prefix a pattern with ! to explicitly exclude it",
    ),
    intent: z.enum(["active_test", "report"]).optional().describe("Defaults to active_test; report eligibility is not active-testing authorization"),
    policy: z.object({
      openScopeUnlistedReports: z.boolean().optional().describe("Program accepts reports for owned assets not listed in scope"),
      activeTestingUnlistedAssets: z.boolean().optional().describe("Explicit program permission to actively test owned assets not listed in scope"),
    }).optional().describe("Only set these from the program's actual policy text"),
    ownership_confirmed: z.boolean().optional().describe("Whether ownership of the unlisted asset has been verified"),
    impact_meets_policy: z.boolean().optional().describe("Whether the report meets the program's impact criteria"),
    policy_loaded: z.boolean().optional().describe("Set false when current program policy could not be loaded or verified; fail closed"),
  }),
  async execute(params) {
    const target = params.target.trim()
    const decision = ScopeGuard.evaluate(target, params.scope_items, {
      intent: params.intent,
      policy: params.policy,
      ownershipConfirmed: params.ownership_confirmed,
      impactMeetsPolicy: params.impact_meets_policy,
      policyLoaded: params.policy_loaded,
    })

    const output = [
      `Target: ${target}`,
      `Decision: ${decision.decision}`,
      `Explicitly in scope: ${decision.inScope ? "YES" : "NO"}`,
      `Active testing authorized: ${decision.activeTestingAuthorized ? "YES" : "NO"}`,
      `Report eligible: ${decision.reportEligible ? "YES" : "NO"}`,
      `Reason: ${decision.reason}`,
      "",
      "Scope check details:",
      ...decision.results.map((r) => `  ${r.matches ? "[MATCH]" : "[NO]"} ${r.scope} — ${r.reason}`),
    ]

    if (!decision.activeTestingAuthorized) {
      output.push("")
      output.push("SAFETY: Do NOT actively test this target. Report eligibility alone is not permission to probe it.")
    }

    return {
      title: `${decision.activeTestingAuthorized ? "Authorized" : decision.reportEligible ? "Report-eligible only" : "Not authorized"}: ${target}`,
      output: output.join("\n"),
      metadata: { target, ...decision },
    }
  },
})
