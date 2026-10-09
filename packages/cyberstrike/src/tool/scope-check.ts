import z from "zod"
import { Tool } from "./tool"
import { ScopeGuard } from "./scope-guard"
import { ScopeAssets, parseScopeAssetCSV, type ScopeAssetRecord } from "./scope-assets"

export { ScopeGuard, type ScopeMatch, type ScopePolicy, type ScopePolicyDecision } from "./scope-guard"
export { ScopeAssets, parseScopeAssetCSV, type ScopeAssetRecord, type ScopeAssetEvaluation } from "./scope-assets"

const assetRecordSchema = z.object({
  identifier: z.string().min(1).describe("Asset identifier from the program's scope export"),
  asset_type: z.string().min(1).describe("For example URL or WILDCARD; unknown types are retained but must be reviewed"),
  instruction: z.string().optional().default(""),
  eligible_for_bounty: z.boolean().optional(),
  eligible_for_submission: z.boolean().optional(),
  availability_requirement: z.string().optional().default(""),
  confidentiality_requirement: z.string().optional().default(""),
  integrity_requirement: z.string().optional().default(""),
  max_severity: z.string().optional().default(""),
  system_tags: z.array(z.string()).optional().default([]),
  created_at: z.string().optional().default(""),
  updated_at: z.string().optional().default(""),
})

export const ScopeCheckTool = Tool.define("scope_check", {
  description:
    "Check authorization using string scope patterns and/or structured bug-bounty asset records. Supports URL and WILDCARD asset types, comma shorthand suffixes, brace alternatives, wildcard-TLD patterns, IPv4/IPv6 CIDRs, exclusions, and the complete asset policy metadata schema. Submission/reward eligibility never independently grants active-testing permission.",
  parameters: z.object({
    target: z.string().describe("Target domain, hostname, IP address, or HTTP(S) URL"),
    scope_items: z.array(z.string()).default([]).describe(
      "Program scope patterns: example.com, *.example.com, https://example.com:8443/api, 192.0.2.0/24, 2001:db8::/32; prefix a pattern with ! to explicitly exclude it",
    ),
    asset_csv: z.string().optional().describe("Raw CSV export with all 12 asset inventory columns"),
    asset_records: z.array(assetRecordSchema).optional().describe(
      "Optional normalized asset inventory export. Each record preserves identifier, asset_type, instruction, bounty/submission eligibility, availability/confidentiality/integrity requirements, max_severity, system_tags, created_at and updated_at",
    ),
    intent: z.enum(["active_test", "report"]).optional().describe("Defaults to active_test; report eligibility is not active-testing authorization"),
    policy: z.object({
      openScopeUnlistedReports: z.boolean().optional().describe("Program accepts reports for owned assets not listed in scope"),
      activeTestingUnlistedAssets: z.boolean().optional().describe("Explicit program permission to actively test owned assets not listed in scope"),
    }).optional().describe("Only set these from the program's actual policy text"),
    ownership_confirmed: z.boolean().optional().describe("Whether ownership of the unlisted asset has been verified"),
    impact_meets_policy: z.boolean().optional().describe("Whether the report meets the program's impact criteria"),
    policy_loaded: z.boolean().optional().describe("Set false when current program policy could not be loaded or verified; fail closed"),
    reported_severity: z.enum(["informational", "info", "low", "medium", "high", "critical"]).optional().describe("Optional proposed report severity; checked against asset max_severity"),
  }),
  async execute(params) {
    const target = params.target.trim()
    const records = params.asset_csv !== undefined
      ? parseScopeAssetCSV(params.asset_csv)
      : (params.asset_records ?? []).map((record) => ({
      identifier: record.identifier,
      asset_type: record.asset_type.toUpperCase(),
      instruction: record.instruction ?? "",
      eligible_for_bounty: record.eligible_for_bounty,
      eligible_for_submission: record.eligible_for_submission,
      availability_requirement: record.availability_requirement ?? "",
      confidentiality_requirement: record.confidentiality_requirement ?? "",
      integrity_requirement: record.integrity_requirement ?? "",
      max_severity: record.max_severity ?? "",
      system_tags: record.system_tags ?? [],
      created_at: record.created_at ?? "",
      updated_at: record.updated_at ?? "",
      raw: Object.fromEntries(Object.entries(record).map(([key, value]) => [key, String(value ?? "")])) as Record<string, string>,
    } satisfies ScopeAssetRecord))
    const assetEvaluation = records.length ? ScopeAssets.evaluate(target, records) : undefined
    const assetMatch = assetEvaluation?.matched === true
    const hasExplicitExclusion = ScopeGuard.check(target, params.scope_items).excluded
    const effectiveScopeItems = assetMatch && !hasExplicitExclusion
      ? [...params.scope_items, target]
      : params.scope_items
    const decision = ScopeGuard.evaluate(target, effectiveScopeItems, {
      intent: params.intent,
      policy: params.policy,
      ownershipConfirmed: params.ownership_confirmed,
      impactMeetsPolicy: params.impact_meets_policy,
      policyLoaded: params.policy_loaded,
    })
    const recordSubmission = assetMatch ? assetEvaluation?.eligible_for_submission : undefined
    const recordBounty = assetMatch ? assetEvaluation?.eligible_for_bounty : undefined
    const reportEligible = decision.reportEligible && recordSubmission !== false
    const bountyEligible = reportEligible && recordBounty === true
    const severityRank: Record<string, number> = { informational: 0, info: 0, low: 1, medium: 2, high: 3, critical: 4 }
    const severityCap = (assetEvaluation?.max_severity ?? "").toLowerCase()
    const severityExceedsCap = Boolean(params.reported_severity && severityCap &&
      severityRank[params.reported_severity] !== undefined && severityRank[severityCap] !== undefined &&
      severityRank[params.reported_severity] > severityRank[severityCap])

    const output = [
      `Target: ${target}`,
      `Decision: ${decision.decision}`,
      `Explicitly in scope: ${decision.inScope ? "YES" : "NO"}`,
      `Structured asset record matched: ${assetMatch ? "YES" : "NO"}`,
      ...(assetMatch && assetEvaluation?.matchedAsset ? [
        `Asset type: ${assetEvaluation.matchedAsset.asset_type}`,
        `Matched identifier: ${assetEvaluation.matchedPattern ?? assetEvaluation.matchedAsset.identifier}`,
        `Eligible for submission: ${recordSubmission === undefined ? "UNKNOWN" : recordSubmission ? "YES" : "NO"}`,
        `Eligible for bounty: ${recordBounty === undefined ? "UNKNOWN" : recordBounty ? "YES" : "NO"}`,
        `Maximum severity: ${assetEvaluation.max_severity || "not specified"}`,
        `System tags: ${assetEvaluation.system_tags?.join(", ") || "none"}`,
        `Availability requirement: ${assetEvaluation.availability_requirement || "not specified"}`,
        `Confidentiality requirement: ${assetEvaluation.confidentiality_requirement || "not specified"}`,
        `Integrity requirement: ${assetEvaluation.integrity_requirement || "not specified"}`,
        `Asset instruction: ${assetEvaluation.instruction || "none"}`,
        `Asset record created: ${assetEvaluation.matchedAsset.created_at || "unknown"}`,
        `Asset record updated: ${assetEvaluation.matchedAsset.updated_at || "unknown"}`,
      ] : []),
      `Active testing authorized: ${decision.activeTestingAuthorized ? "YES" : "NO"}`,
      `Report eligible: ${reportEligible ? "YES" : "NO"}`,
      `Bounty eligible: ${bountyEligible ? "YES" : recordBounty === false ? "NO" : "UNKNOWN"}`,
      ...(params.reported_severity ? [`Proposed report severity: ${params.reported_severity}`, `Within asset severity cap: ${severityExceedsCap ? "NO" : severityCap ? "YES" : "UNKNOWN"}`] : []),
      `Reason: ${assetMatch ? assetEvaluation?.reason : decision.reason}`,
      "",
      "Scope check details:",
      ...decision.results\n        .filter((r) => !(assetMatch && r.scope === target && !params.scope_items.includes(target)))\n        .map((r) => `  ${r.matches ? "[MATCH]" : "[NO]"} ${r.scope} — ${r.reason}`),\n      ...(assetMatch && assetEvaluation?.matchedAsset ? [`  [MATCH] ${assetEvaluation.matchedAsset.identifier} — structured asset inventory (${assetEvaluation.matchedAsset.asset_type})`] : []),
    ]

    if (!decision.activeTestingAuthorized) {
      output.push("", "SAFETY: Do NOT actively test this target. Report eligibility alone is not permission to probe it.")
    }
    if (assetMatch && assetEvaluation?.matchedAsset?.max_severity) {
      output.push("", `SEVERITY CAP: Do not report a severity above ${assetEvaluation.max_severity} for this asset without explicit program guidance.`)
    }
    if (severityExceedsCap) output.push("", "POLICY WARNING: The proposed severity exceeds this asset max_severity. Reassess the rating or obtain explicit program guidance.")
    return {
      title: `${decision.activeTestingAuthorized ? "Authorized" : reportEligible ? "Report-eligible only" : "Not authorized"}: ${target}`,
      output: output.join("\n"),
      metadata: { target, ...decision, assetEvaluation: assetEvaluation ? { ...assetEvaluation, active_testing_authorized: decision.activeTestingAuthorized } : undefined, reportEligible, bountyEligible, severityExceedsCap },
    }
  },
})
