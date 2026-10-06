import fs from "fs/promises"
import path from "path"
import { eq, and, desc } from "drizzle-orm"
import { Database } from "../storage/db"
import { RequestTable, WebFunctionTable } from "../session/session.sql"
import { TargetWorkspace } from "../tool/target-workspace"

export type BusinessFunctionRecord = {
  function_id: string
  surface: "ui-api"
  location: string
  preconditions: string[]
  normal_action: string
  expected_result: string
  side_effects: string[]
  business_invariant: string[]
  next_valid_states: string[]
  identity_context: { roles: string[]; credential?: string }
  evidence: { request_id: string; method: string; path: string; status?: number; trigger?: string }
  inverse_hypotheses: string[]
  attack_surface_refs: string[]
  classifications: string[]
  confidence: "observed" | "inferred"
}

export type BusinessAttackSurface = {
  schema_version: 1
  generated_at: string
  target: string
  session_id: string
  coverage: { discovered: number; modeled: number; blocked: number }
  functions: BusinessFunctionRecord[]
}

function inferAction(method: string, actionType: string, trigger?: string) {
  const action = (trigger || actionType || method).trim()
  return `${method} ${action}`
}

export function inverseHypotheses(method: string, actionType: string, roles: string[], trigger?: string): string[] {
  const out = [
    "Can the action be invoked before its observed preconditions are satisfied?",
    "Can the same action be replayed after the observed state transition?",
  ]
  if (roles.length) out.push("Can a lower-privileged or different-role identity invoke the same function?")
  if (/POST|PUT|PATCH|DELETE/i.test(method)) out.push("Can one observed business parameter or object identifier be changed while preserving the request shape?")
  if (/delete|remove|cancel|refund|approve|payout|purchase|checkout/i.test(`${actionType} ${trigger}`)) {
    out.push("Can the terminal transition be repeated or reordered without restoring the required prior state?")
  }
  return [...new Set(out)]
}

export function classifications(method: string, actionType: string, trigger?: string): string[] {
  const s = `${method} ${actionType} ${trigger ?? ""}`.toLowerCase()
  const out: string[] = []
  if (/create|update|delete|post|put|patch/.test(s)) out.push("state-transition-abuse")
  if (/price|amount|quantity|coupon|discount|refund|credit|payment|checkout/.test(s)) out.push("pricing/financial")
  if (/role|admin|permission|owner|tenant/.test(s)) out.push("authorization/ownership")
  if (/invite|claim|redeem|reset|approve|publish|cancel/.test(s)) out.push("workflow-ordering")
  if (/delete|remove|refund|claim|redeem|invite/.test(s)) out.push("replay/idempotency")
  return [...new Set(out)]
}

export async function buildBusinessFunctionWalk(input: {
  target: string
  sessionID: string
}): Promise<BusinessAttackSurface> {
  const rows = Database.use((db) =>
    db.select({
      functionID: WebFunctionTable.id,
      actionType: WebFunctionTable.action_type,
      requestID: WebFunctionTable.request_id,
      roleID: WebFunctionTable.role_id,
      objects: WebFunctionTable.objects,
      method: RequestTable.method,
      path: RequestTable.normalized_path,
      status: RequestTable.response_status,
      trigger: RequestTable.trigger_element,
      roles: RequestTable.element_roles,
      credential: RequestTable.credential_id,
      pageURL: RequestTable.page_url,
    })
      .from(WebFunctionTable)
      .innerJoin(RequestTable, eq(WebFunctionTable.request_id, RequestTable.id))
      .where(eq(WebFunctionTable.session_id, input.sessionID))
      .orderBy(desc(WebFunctionTable.time_created))
      .all(),
  )

  const functions: BusinessFunctionRecord[] = rows.map((row) => {
    const roles = row.roles ?? (row.roleID ? [row.roleID] : [])
    const location = row.pageURL ? `${row.pageURL} -> ${row.trigger ?? row.path}` : row.path
    const invariant = [
      "Observed preconditions must remain satisfied.",
      "The observed state transition must not create an unauthorized or impossible state.",
    ]
    return {
      function_id: row.functionID,
      surface: "ui-api",
      location,
      preconditions: [
        row.credential ? `identity: ${row.credential}` : "identity: observed/anonymous",
        ...(roles.length ? [`available_roles: ${roles.join(", ")}`] : []),
      ],
      normal_action: inferAction(row.method, row.actionType, row.trigger ?? undefined),
      expected_result: row.status ? `Observed HTTP status ${row.status}; verify the resulting state from subsequent evidence.` : "Observe response and state transition.",
      side_effects: row.objects ?? [],
      business_invariant: invariant,
      next_valid_states: ["inferred from subsequent requests/state evidence"],
      identity_context: { roles, credential: row.credential ?? undefined },
      evidence: {
        request_id: row.requestID,
        method: row.method,
        path: row.path,
        status: row.status ?? undefined,
        trigger: row.trigger ?? undefined,
      },
      inverse_hypotheses: inverseHypotheses(row.method, row.actionType, roles, row.trigger ?? undefined),
      attack_surface_refs: [],
      classifications: classifications(row.method, row.actionType, row.trigger ?? undefined),
      confidence: "observed",
    }
  })

  const modeled = functions.filter((x) => x.evidence.request_id).length
  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    target: input.target,
    session_id: input.sessionID,
    coverage: { discovered: functions.length, modeled, blocked: 0 },
    functions,
  }
}

export async function persistBusinessFunctionWalk(input: {
  target: string
  sessionID: string
}): Promise<string> {
  const surface = await buildBusinessFunctionWalk(input)
  const paths = await TargetWorkspace.ensure(input.target, input.sessionID)
  const walkFile = path.join(paths.artifacts, "business-function-walk.json")
  const attackFile = path.join(paths.artifacts, "business-attack-surface.json")

  const attackSurface = {
    schema_version: 1,
    generated_at: surface.generated_at,
    target: surface.target,
    session_id: surface.session_id,
    coverage: surface.coverage,
    entries: surface.functions.map((fn) => ({
      function_id: fn.function_id,
      location: fn.location,
      normal: {
        action: fn.normal_action,
        expected: fn.expected_result,
        invariant: fn.business_invariant,
      },
      inverse_hypotheses: fn.inverse_hypotheses,
      classifications: fn.classifications,
      relevant_skills: [
        "business-logic-vuln",
        ...(fn.classifications.includes("authorization/ownership") ? ["auth-sec"] : []),
        ...(fn.evidence.path.startsWith("/") || fn.evidence.method ? ["api-sec"] : []),
      ],
      evidence_state: "observed",
      evidence: fn.evidence,
    })),
  }

  await fs.writeFile(walkFile, JSON.stringify(surface, null, 2) + "\n", "utf8")
  await fs.writeFile(attackFile, JSON.stringify(attackSurface, null, 2) + "\n", "utf8")
  return walkFile
}
