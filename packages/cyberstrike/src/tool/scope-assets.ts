import { ScopeGuard } from "./scope-guard"

export type ScopeAssetRecord = {
  identifier: string
  asset_type: string
  instruction: string
  eligible_for_bounty: boolean | undefined
  eligible_for_submission: boolean | undefined
  availability_requirement: string
  confidentiality_requirement: string
  integrity_requirement: string
  max_severity: string
  system_tags: string[]
  created_at: string
  updated_at: string
  raw: Record<string, string>
}

export type ScopeAssetEvaluation = {
  matched: boolean
  matchedAsset?: ScopeAssetRecord
  matchedPattern?: string
  eligible_for_bounty?: boolean
  eligible_for_submission?: boolean
  max_severity?: string
  instruction?: string
  availability_requirement?: string
  confidentiality_requirement?: string
  integrity_requirement?: string
  system_tags?: string[]
  active_testing_authorized: boolean
  reason: string
}

const REQUIRED_COLUMNS = [
  "identifier", "asset_type", "instruction", "eligible_for_bounty",
  "eligible_for_submission", "availability_requirement", "confidentiality_requirement",
  "integrity_requirement", "max_severity", "system_tags", "created_at", "updated_at",
] as const

function parseCSVRows(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i++ }
      else if (char === '"') quoted = false
      else field += char
    } else if (char === '"' && field.length === 0) quoted = true
    else if (char === ",") { row.push(field); field = "" }
    else if (char === "\n") {
      row.push(field.replace(/\r$/, ""))
      if (row.some((cell) => cell.trim() !== "")) rows.push(row)
      row = []; field = ""
    } else field += char
  }
  if (quoted) throw new Error("Malformed scope CSV: unterminated quoted field")
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""))
    if (row.some((cell) => cell.trim() !== "")) rows.push(row)
  }
  return rows
}

function parseBoolean(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase()
  if (normalized === "true") return true
  if (normalized === "false") return false
  return undefined
}

/** Import the common bug-bounty platform asset CSV schema without dropping policy fields. */
export function parseScopeAssetCSV(input: string): ScopeAssetRecord[] {
  const rows = parseCSVRows(input)
  if (rows.length < 2) throw new Error("Scope CSV must contain a header and at least one asset")
  const headers = rows[0].map((h) => h.trim().toLowerCase())
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column))
  if (missing.length) throw new Error(`Scope CSV is missing required columns: ${missing.join(", ")}`)
  const indexes = new Map(headers.map((header, index) => [header, index]))
  return rows.slice(1).map((cells, rowIndex) => {
    const raw: Record<string, string> = {}
    for (const header of headers) raw[header] = (cells[indexes.get(header) ?? -1] ?? "").trim()
    const get = (key: typeof REQUIRED_COLUMNS[number]) => (cells[indexes.get(key) ?? -1] ?? "").trim()
    const identifier = get("identifier")
    const asset_type = get("asset_type").toUpperCase()
    if (!identifier) throw new Error(`Scope CSV row ${rowIndex + 2} has an empty identifier`)
    if (!asset_type) throw new Error(`Scope CSV row ${rowIndex + 2} has an empty asset_type`)
    return {
      identifier,
      asset_type,
      instruction: get("instruction"),
      eligible_for_bounty: parseBoolean(get("eligible_for_bounty")),
      eligible_for_submission: parseBoolean(get("eligible_for_submission")),
      availability_requirement: get("availability_requirement"),
      confidentiality_requirement: get("confidentiality_requirement"),
      integrity_requirement: get("integrity_requirement"),
      max_severity: get("max_severity").toLowerCase(),
      system_tags: get("system_tags").split(/[;,]/).map((tag) => tag.trim()).filter(Boolean),
      created_at: get("created_at"),
      updated_at: get("updated_at"),
      raw,
    }
  })
}

function splitAlternatives(identifier: string): string[] {
  const parts = identifier.split(/,(?![^{}]*})/).map((part) => part.trim()).filter(Boolean)
  if (parts.length < 2) return parts
  const first = parts[0]
  if (!first.startsWith("*.")) return parts
  const labels = first.slice(2).split(".")
  const commonTwoLabelSuffixes = new Set(["co.uk", "org.uk", "ac.uk", "com.au", "net.au", "org.au", "com.br", "com.cn", "com.mx", "co.jp", "co.kr", "com.sg", "com.tr", "com.pl"])
  const lastTwo = labels.slice(-2).join(".")
  const base = "*." + labels.slice(0, commonTwoLabelSuffixes.has(lastTwo) ? -2 : -1).join(".")
  return parts.map((part, index) => {
    if (index === 0) return part
    const suffix = part.replace(/^\./, "")
    if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/i.test(suffix) && !part.includes("*") && !part.includes("{")) {
      return `${base}.${suffix}`
    }
    return part
  })
}

function expandBraces(pattern: string): string[] {
  const match = pattern.match(/\{([^{}]+)\}/)
  if (!match) return [pattern]
  return match[1].split(",").map((item) => pattern.replace(match[0], item.trim())).flatMap(expandBraces)
}

function hostOf(target: string): { host: string; url: URL } | undefined {
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(target) ? target : `https://${target}`)
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
    return { host: url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, ""), url }
  } catch { return undefined }
}

function wildcardTldMatch(host: string, pattern: string): boolean {
  const normalized = pattern.toLowerCase().replace(/^\*\./, "")
  if (!normalized.endsWith(".*")) return false
  const base = normalized.slice(0, -2)
  const marker = "." + base + "."
  const index = host.indexOf(marker)
  const isRoot = host.startsWith(base + ".")
  const suffix = isRoot ? host.slice(base.length + 1) : index >= 0 ? host.slice(index + marker.length) : ""
  const prefix = isRoot ? "" : index >= 0 ? host.slice(0, index) : ""
  if (!suffix || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)?$/.test(suffix)) return false
  if (suffix.split(".").length === 2 && !/^(co|com|org|net|gov|ac|edu)\.[a-z]{2}$/i.test(suffix)) return false
  return !prefix || prefix.split(".").every((label) => /^[a-z0-9-]+$/.test(label))
}

function matchIdentifier(target: string, record: ScopeAssetRecord): { matched: boolean; pattern?: string } {
  const parsed = hostOf(target)
  if (!parsed) return { matched: false }
  const patterns = splitAlternatives(record.identifier).flatMap(expandBraces)
  for (const raw of patterns) {
    const pattern = raw.trim().toLowerCase()
    if (!pattern) continue
    if (pattern.includes(".*") && !pattern.startsWith("*.")) {
      if (wildcardTldMatch(parsed.host, pattern)) return { matched: true, pattern: raw }
      continue
    }
    const result = ScopeGuard.check(target, [pattern])
    if (result.inScope) return { matched: true, pattern: raw }
  }
  return { matched: false }
}

function recordSpecificity(record: ScopeAssetRecord): number {
  const type = record.asset_type.toUpperCase()
  return type === "URL" ? 3 : type === "WILDCARD" ? 1 : 2
}

/**
 * Evaluates structured asset inventories. Asset identifiers determine matching;
 * submission/reward/impact fields are retained as policy metadata and never
 * grant active-testing authorization by themselves.
 */
export namespace ScopeAssets {
  export function evaluate(target: string, assets: readonly ScopeAssetRecord[]): ScopeAssetEvaluation {
    const matches = assets
      .map((asset) => ({ asset, match: matchIdentifier(target, asset) }))
      .filter((entry) => entry.match.matched)
      .sort((a, b) => recordSpecificity(b.asset) - recordSpecificity(a.asset))
    const found = matches[0]
    if (!found) return {
      matched: false,
      active_testing_authorized: false,
      reason: "no structured asset identifier matched; do not actively test without a separate verified policy decision",
    }
    const { asset } = found
    return {
      matched: true,
      matchedAsset: asset,
      matchedPattern: found.match.pattern,
      eligible_for_bounty: asset.eligible_for_bounty,
      eligible_for_submission: asset.eligible_for_submission,
      max_severity: asset.max_severity || undefined,
      instruction: asset.instruction || undefined,
      availability_requirement: asset.availability_requirement || undefined,
      confidentiality_requirement: asset.confidentiality_requirement || undefined,
      integrity_requirement: asset.integrity_requirement || undefined,
      system_tags: asset.system_tags,
      active_testing_authorized: false,
      reason: "asset inventory match found; record metadata does not itself establish active-testing permission",
    }
  }
}
