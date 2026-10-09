import path from "node:path"

export interface HuntingPolicies {
  mission: {
    unknown_scope: "BLOCK"
    require_provenance: boolean
    anti_early_exit: boolean
  }
  validation: {
    default_attempt_budget: number
    allow_early_stop: boolean
    require_reason_for_attempt: boolean
  }
  safety: {
    require_scope_gate: boolean
    require_authorization_gate: boolean
    require_rate_limit_gate: boolean
    require_risk_gate: boolean
    never_store_secrets: boolean
  }
  learning: {
    rewrite_skills: boolean
    bounded_scores: boolean
  }
  context: {
    persistent_state_is_authoritative: boolean
    max_task_records: number
  }
}

const DEFAULTS: HuntingPolicies = {
  mission: { unknown_scope: "BLOCK", require_provenance: true, anti_early_exit: true },
  validation: { default_attempt_budget: 20, allow_early_stop: true, require_reason_for_attempt: true },
  safety: { require_scope_gate: true, require_authorization_gate: true, require_rate_limit_gate: true, require_risk_gate: true, never_store_secrets: true },
  learning: { rewrite_skills: false, bounded_scores: true },
  context: { persistent_state_is_authoritative: true, max_task_records: 40 },
}

// Small, dependency-free parser for the scalar-only policy schema used here.
function parsePolicyYaml(source: string): Record<string, Record<string, string | number | boolean>> {
  const result: Record<string, Record<string, string | number | boolean>> = {}
  let section = ""
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, "")
    if (!line.trim()) continue
    const header = line.match(/^([a-zA-Z_][\w-]*):\s*$/)
    if (header) { section = header[1]; result[section] ??= {}; continue }
    const entry = line.match(/^\s{2}([a-zA-Z_][\w-]*):\s*(.*?)\s*$/)
    if (!entry || !section) throw new Error("POLICY_CONFIG_INVALID: unsupported YAML syntax")
    const [, key, rawValue] = entry
    let value: string | number | boolean
    if (rawValue === "true") value = true
    else if (rawValue === "false") value = false
    else if (/^-?\d+$/.test(rawValue)) value = Number(rawValue)
    else value = rawValue.replace(/^["']|["']$/g, "")
    result[section][key] = value
  }
  return result
}

export async function loadPolicies(root: string): Promise<HuntingPolicies> {
  const file = path.join(root, "config", "policies.yaml")
  const bunFile = Bun.file(file)
  if (!(await bunFile.exists())) return structuredClone(DEFAULTS)
  const parsed = parsePolicyYaml(await bunFile.text())
  const policies = {
    mission: { ...DEFAULTS.mission, ...(parsed.mission ?? {}) },
    validation: { ...DEFAULTS.validation, ...(parsed.validation ?? {}) },
    safety: { ...DEFAULTS.safety, ...(parsed.safety ?? {}) },
    learning: { ...DEFAULTS.learning, ...(parsed.learning ?? {}) },
    context: { ...DEFAULTS.context, ...(parsed.context ?? {}) },
  } as HuntingPolicies
  if (policies.mission.unknown_scope !== "BLOCK") throw new Error("POLICY_CONFIG_INVALID: mission.unknown_scope must be BLOCK")
  if (!Number.isInteger(policies.validation.default_attempt_budget) || policies.validation.default_attempt_budget < 1 || policies.validation.default_attempt_budget > 100) throw new Error("POLICY_CONFIG_INVALID: validation.default_attempt_budget must be an integer from 1 to 100")
  if (!Number.isInteger(policies.context.max_task_records) || policies.context.max_task_records < 1) throw new Error("POLICY_CONFIG_INVALID: context.max_task_records must be a positive integer")
  for (const [section, values] of Object.entries(policies)) {
    for (const [key, value] of Object.entries(values)) {
      if (typeof value !== "boolean" && !(section === "validation" && key === "default_attempt_budget") && !(section === "context" && key === "max_task_records") && !(section === "mission" && key === "unknown_scope")) {
        throw new Error(`POLICY_CONFIG_INVALID: ${section}.${key} has an invalid type`)
      }
    }
  }
  return policies
}

const SECRET_KEY = /(authorization|cookie|set-cookie|password|passwd|secret|access.?token|refresh.?token|api.?key|client.?secret|session.?id|credential(?!fingerprint)|private.?key)/i
const SECRET_VALUE = /\b(Bearer\s+)[A-Za-z0-9._~+\/-]+=*|\b(sk-[A-Za-z0-9_-]{16,})\b/gi

export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => redactSecrets(item)) as T
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SECRET_KEY.test(key) && item != null ? "[REDACTED]" : redactSecrets(item)
    }
    return output as T
  }
  if (typeof value === "string") return value.replace(SECRET_VALUE, (_match, prefix: string | undefined) => prefix ? prefix + "[REDACTED]" : "[REDACTED]") as T
  return value
}
