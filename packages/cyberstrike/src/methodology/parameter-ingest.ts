import { Intel } from "../methodology/intel"

const PARAMETER_TOOLS = new Set(["arjun", "paramspider", "x8"])

function endpointFromArgs(args: Record<string, unknown>) {
  for (const key of ["url", "target", "endpoint"]) {
    const value = args[key]
    if (typeof value === "string" && /^https?:\/\//i.test(value)) return value
  }
  return undefined
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).flatMap(collectStrings)
  return []
}

function validParameter(name: string) {
  return /^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(name) && !/^(http|https|www)$/i.test(name)
}

/**
 * Ingest only high-confidence parameter-shaped data from structured tool output.
 * Free-form lines are intentionally conservative to avoid turning URLs/logs into parameters.
 */
export function ingestParameterDiscovery(input: {
  sessionID?: string
  tool: string
  args: Record<string, unknown>
  output: unknown
}) {
  if (!input.sessionID || !PARAMETER_TOOLS.has(input.tool)) return 0
  const endpoint = endpointFromArgs(input.args)
  if (!endpoint) return 0

  const names = new Set<string>()
  const walk = (value: unknown) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>
      for (const key of ["parameter", "param", "name", "parameterName"]) {
        if (typeof obj[key] === "string" && validParameter(obj[key])) names.add(obj[key])
      }
      for (const child of Object.values(obj)) walk(child)
      return
    }
    for (const line of collectStrings(value).join("\n").split(/\r?\n/)) {
      const match = line.match(/^(?:[+*-]\s*)?(?:parameter|param)\s*[:=]\s*([A-Za-z_][A-Za-z0-9_.-]{0,127})$/i)
      if (match && validParameter(match[1])) names.add(match[1])
    }
  }
  walk(input.output)

  let added = 0
  for (const name of names) {
    const result = Intel.addParameter({
      sessionID: input.sessionID,
      endpoint,
      name,
      source: input.tool,
      confidence: input.tool === "paramspider" ? "medium" : "high",
      detail: "Canonical parameter discovery ingestion",
    })
    if (!result.duplicate) added++
  }
  return added
}
