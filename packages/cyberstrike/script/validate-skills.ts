import matter from "gray-matter"
import path from "node:path"
import { readdirSync } from "node:fs"

export type SkillInventoryItem = {
  path: string
  name: string
  description: string
  chains_with: string[]
  prerequisites: string[]
  severity_boost: Record<string, string>
  files: string[]
}

export type RegistryEntry = { name: string; files?: string[] }

export type ValidationReport = {
  skillFiles: number
  uniqueNames: number
  duplicateNames: string[]
  invalidSkills: string[]
  brokenChains: Array<{ skill: string; target: string }>
  brokenSeverityBoosts: Array<{ skill: string; target: string }>
  unknownPrerequisites: Array<{ skill: string; prerequisite: string }>
  registryEntries: number
  registryDuplicates: string[]
  orphanRegistryEntries: string[]
  unindexedSkillNames: string[]
  brokenRegistryFiles: Array<{ skill: string; file: string }>
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : []
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v === "string"))
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(file))
    else if (entry.isFile() && entry.name === "SKILL.md") out.push(file)
  }
  return out
}

function looksLikeSkillID(value: string) {
  return /^[a-z0-9][a-z0-9._-]*$/.test(value.trim())
}

export function validateSkillSet(items: SkillInventoryItem[], registry: RegistryEntry[]): ValidationReport {
  const byName = new Map<string, SkillInventoryItem[]>()
  for (const item of items) {
    const bucket = byName.get(item.name) ?? []
    bucket.push(item)
    byName.set(item.name, bucket)
  }
  const names = new Set(byName.keys())
  const duplicateNames = [...byName.entries()].filter(([, xs]) => xs.length > 1).map(([name]) => name).sort()
  const invalidSkills: string[] = []
  const brokenChains: ValidationReport["brokenChains"] = []
  const brokenSeverityBoosts: ValidationReport["brokenSeverityBoosts"] = []
  const unknownPrerequisites: ValidationReport["unknownPrerequisites"] = []

  for (const item of items) {
    if (!item.name || !item.description) invalidSkills.push(item.path)
    for (const target of item.chains_with) if (!names.has(target)) brokenChains.push({ skill: item.name, target })
    for (const target of Object.keys(item.severity_boost)) if (!names.has(target)) brokenSeverityBoosts.push({ skill: item.name, target })
    for (const prerequisite of item.prerequisites) {
      if (looksLikeSkillID(prerequisite) && !names.has(prerequisite) && !/^(T\d{4}(?:\.\d{3})?|CWE-\d+|WSTG-[A-Z0-9-]+)$/i.test(prerequisite)) {
        unknownPrerequisites.push({ skill: item.name, prerequisite })
      }
    }
  }

  const registryNames = registry.map((x) => x.name)
  const registrySet = new Set(registryNames)
  const registryDuplicates = [...new Set(registryNames.filter((name, i) => registryNames.indexOf(name) !== i))].sort()
  const orphanRegistryEntries = registryNames.filter((name) => !names.has(name)).sort()
  const unindexedSkillNames = [...names].filter((name) => !registrySet.has(name)).sort()
  const brokenRegistryFiles: ValidationReport["brokenRegistryFiles"] = []
  for (const entry of registry) {
    const roots = byName.get(entry.name) ?? []
    const root = roots[0]
    if (!root || !entry.files) continue
    const rootDir = path.dirname(root.path)
    for (const rel of entry.files) {
      const candidate = path.resolve(rootDir, rel)
      if (!candidate.startsWith(rootDir + path.sep) || !Bun.file(candidate).size && !Bun.file(candidate).exists()) {
        brokenRegistryFiles.push({ skill: entry.name, file: rel })
      }
    }
  }

  return {
    skillFiles: items.length,
    uniqueNames: names.size,
    duplicateNames,
    invalidSkills,
    brokenChains,
    brokenSeverityBoosts,
    unknownPrerequisites,
    registryEntries: registry.length,
    registryDuplicates,
    orphanRegistryEntries,
    unindexedSkillNames,
    brokenRegistryFiles,
  }
}

async function main() {
  const root = path.resolve(import.meta.dir, "../../..")
  const skillRoot = path.join(root, ".cyberstrike", "skill")
  const files = walk(skillRoot).sort()
  const items: SkillInventoryItem[] = []
  for (const file of files) {
    try {
      const parsed = matter(await Bun.file(file).text())
      const data = parsed.data as Record<string, unknown>
      items.push({
        path: file,
        name: typeof data.name === "string" ? data.name.trim() : "",
        description: typeof data.description === "string" ? data.description.trim() : "",
        chains_with: asStringArray(data.chains_with),
        prerequisites: asStringArray(data.prerequisites),
        severity_boost: asStringRecord(data.severity_boost),
        files: [],
      })
    } catch {
      items.push({ path: file, name: "", description: "", chains_with: [], prerequisites: [], severity_boost: {}, files: [] })
    }
  }

  let registry: RegistryEntry[] = []
  const registryPath = path.join(skillRoot, "index.json")
  if (await Bun.file(registryPath).exists()) {
    const parsed = JSON.parse(await Bun.file(registryPath).text()) as { skills?: RegistryEntry[] }
    registry = Array.isArray(parsed.skills) ? parsed.skills : []
  }

  const report = validateSkillSet(items, registry)
  console.log(JSON.stringify(report, null, 2))
  const errors = report.invalidSkills.length + report.brokenChains.length + report.brokenSeverityBoosts.length + report.registryDuplicates.length + report.orphanRegistryEntries.length + report.brokenRegistryFiles.length
  const warnings = report.unindexedSkillNames.length + report.unknownPrerequisites.length
  if (warnings) console.warn(`WARN registry coverage: ${report.unindexedSkillNames.length} skill names are not in the legacy index; ${report.unknownPrerequisites.length} prerequisites need review`)
  if (report.duplicateNames.length) console.warn(`WARN duplicate skill names: ${report.duplicateNames.join(", ")}`)
  if (report.unknownPrerequisites.length) console.warn(`WARN unknown prerequisite identifiers: ${report.unknownPrerequisites.length}`)
  console.log(`skills=${report.skillFiles} unique_names=${report.uniqueNames} registry_entries=${report.registryEntries} unindexed_names=${report.unindexedSkillNames.length}`)
  if (errors) process.exit(1)
}

if (import.meta.main) main().catch((error) => { console.error(error); process.exit(1) })
