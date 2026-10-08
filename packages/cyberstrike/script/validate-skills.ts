import matter from "gray-matter"
import path from "node:path"
import { readdirSync, statSync } from "node:fs"

export type SkillInventoryItem = {
  path: string
  relativePath?: string
  name: string
  description: string
  chains_with: string[]
  prerequisites: string[]
  severity_boost: Record<string, string>
  files: string[]
}

export type RegistryEntry = {
  name: string
  description?: string
  path?: string
  files?: string[]
}

export type ValidationReport = {
  skillFiles: number
  uniqueNames: number
  duplicateNames: string[]
  invalidSkills: string[]
  missingDescriptions: string[]
  brokenChains: Array<{ skill: string; target: string }>
  brokenSeverityBoosts: Array<{ skill: string; target: string }>
  unknownPrerequisites: Array<{ skill: string; prerequisite: string }>
  registryEntries: number
  registryDuplicates: string[]
  orphanRegistryEntries: string[]
  registryPathMismatches: Array<{ skill: string; path: string; actualName?: string }>
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

function statSafe(file: string): boolean {
  try {
    return statSync(file).isFile()
  } catch {
    return false
  }
}

function safeRelative(value: string): string | undefined {
  const normalizedInput = value.replaceAll("\\", "/")
  if (normalizedInput.startsWith("/") || /^[A-Za-z]:\//.test(normalizedInput)) return undefined
  const normalized = path.posix.normalize(normalizedInput)
  if (normalized === ".." || normalized.startsWith("../")) return undefined
  return normalized === "." ? "" : normalized
}

function fallbackDescription(name: string, content: string): string {
  const heading = content.match(/^#{1,2}\s+(.+)$/m)?.[1]?.trim()
  if (heading) return heading.replace(/^SKILL:\s*/i, "").trim()
  return name.replace(/[-_]+/g, " ").trim()
}

function isExternalReference(value: string): boolean {
  return /^(?:TA\d{4}(?:[._-].*)?|T\d{4}(?:\.\d{3})?|CWE-\d+|WSTG-[A-Z0-9._-]+|[A-Z]{1,5}-\d+(?:\(\d+\))?(?:[._-].*)?|[a-z0-9]+(?:-[a-z0-9]+)*-access)$/i.test(
    value.trim(),
  )
}

function normalizeName(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback
}

export function validateSkillSet(
  items: SkillInventoryItem[],
  registry: RegistryEntry[],
  skillRoot?: string,
): ValidationReport {
  const byName = new Map<string, SkillInventoryItem[]>()
  const aliases = new Set<string>()

  for (const item of items) {
    const bucket = byName.get(item.name) ?? []
    bucket.push(item)
    byName.set(item.name, bucket)

    const relativePath = item.relativePath ?? path.basename(path.dirname(item.path))
    const parts = relativePath.split("/")
    if (parts.length > 1) aliases.add(parts[parts.length - 2])
  }

  const names = new Set([...byName.keys()].filter(Boolean))
  const duplicateNames = [...byName.entries()]
    .filter(([name, xs]) => name && xs.length > 1)
    .map(([name]) => name)
    .sort()

  const invalidSkills = items
    .filter((item) => !item.name)
    .map((item) => item.path)
    .sort()
  const missingDescriptions = items
    .filter((item) => !item.description)
    .map((item) => item.relativePath ?? item.path)
    .sort()

  const brokenChains: ValidationReport["brokenChains"] = []
  const brokenSeverityBoosts: ValidationReport["brokenSeverityBoosts"] = []
  const unknownPrerequisites: ValidationReport["unknownPrerequisites"] = []

  for (const item of items) {
    for (const target of item.chains_with) {
      if (!names.has(target) && !aliases.has(target) && !isExternalReference(target)) {
        brokenChains.push({ skill: item.name, target })
      }
    }

    for (const target of Object.keys(item.severity_boost)) {
      if (!names.has(target) && !aliases.has(target) && !isExternalReference(target)) {
        brokenSeverityBoosts.push({ skill: item.name, target })
      }
    }

    for (const prerequisite of item.prerequisites) {
      const normalized = prerequisite.trim()
      if (normalized && !names.has(normalized) && !aliases.has(normalized) && !isExternalReference(normalized)) {
        unknownPrerequisites.push({ skill: item.name, prerequisite: normalized })
      }
    }
  }

  const registryNames = registry.map((x) => x.name).filter(Boolean)
  const registrySet = new Set(registryNames)
  const registryDuplicates = [...new Set(registryNames.filter((name, i) => registryNames.indexOf(name) !== i))].sort()
  const orphanRegistryEntries: string[] = []
  const registryPathMismatches: ValidationReport["registryPathMismatches"] = []
  const brokenRegistryFiles: ValidationReport["brokenRegistryFiles"] = []

  for (const entry of registry) {
    let rootDir: string | undefined
    let actualName: string | undefined

    if (entry.path && skillRoot) {
      const safePath = safeRelative(entry.path)
      const rootResolved = path.resolve(skillRoot)
      const candidate: string | undefined = safePath === undefined ? undefined : path.resolve(rootResolved, safePath)

      if (!candidate || (candidate !== rootResolved && !candidate.startsWith(rootResolved + path.sep))) {
        registryPathMismatches.push({ skill: entry.name, path: entry.path })
        continue
      }

      rootDir = candidate
      const md = path.join(rootDir, "SKILL.md")
      if (!statSafe(md)) {
        orphanRegistryEntries.push(entry.name)
        continue
      }

      const matchingItem = items.find((item) => path.dirname(item.path) === rootDir)
      actualName = matchingItem?.name ?? path.basename(rootDir)

      if (actualName !== entry.name) {
        registryPathMismatches.push({ skill: entry.name, path: entry.path, actualName })
      }
    } else {
      const candidates = items.filter((item) => item.name === entry.name)
      if (candidates.length === 1) rootDir = path.dirname(candidates[0].path)
      else {
        const byDir = items.filter((item) => path.basename(path.dirname(item.path)) === entry.name)
        if (byDir.length === 1) rootDir = path.dirname(byDir[0].path)
        else orphanRegistryEntries.push(entry.name)
      }
    }

    if (rootDir && entry.files) {
      for (const rel of entry.files) {
        const safe = safeRelative(rel)
        const candidate: string | undefined = safe === undefined ? undefined : path.resolve(rootDir, safe)
        if (
          !candidate ||
          (candidate !== rootDir && !candidate.startsWith(rootDir + path.sep)) ||
          !statSafe(candidate)
        ) {
          brokenRegistryFiles.push({ skill: entry.name, file: rel })
        }
      }
    }
  }

  const unindexedSkillNames = [...names].filter((name) => !registrySet.has(name)).sort()

  return {
    skillFiles: items.length,
    uniqueNames: names.size,
    duplicateNames,
    invalidSkills,
    missingDescriptions,
    brokenChains,
    brokenSeverityBoosts,
    unknownPrerequisites,
    registryEntries: registry.length,
    registryDuplicates,
    orphanRegistryEntries: [...new Set(orphanRegistryEntries)].sort(),
    registryPathMismatches,
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
      const content = await Bun.file(file).text()
      const parsed = matter(content)
      const relativePath = path.relative(skillRoot, file).split(path.sep).join("/")
      const directoryName = path.posix.basename(path.posix.dirname(relativePath))
      const name = normalizeName(parsed.data?.name, directoryName)
      const rawDescription = typeof parsed.data?.description === "string" ? parsed.data.description.trim() : ""
      const description = rawDescription || fallbackDescription(name, parsed.content)

      items.push({
        path: file,
        relativePath,
        name,
        description,
        chains_with: asStringArray(parsed.data?.chains_with),
        prerequisites: asStringArray(parsed.data?.prerequisites),
        severity_boost: asStringRecord(parsed.data?.severity_boost),
        files: [],
      })
    } catch {
      const relativePath = path.relative(skillRoot, file).split(path.sep).join("/")
      const directoryName = path.posix.basename(path.posix.dirname(relativePath))
      items.push({
        path: file,
        relativePath,
        name: directoryName,
        description: "",
        chains_with: [],
        prerequisites: [],
        severity_boost: {},
        files: [],
      })
    }
  }

  const registryPath = path.join(skillRoot, "index.json")
  let registry: RegistryEntry[] = []
  if (await Bun.file(registryPath).exists()) {
    const parsed = JSON.parse(await Bun.file(registryPath).text()) as { skills?: RegistryEntry[] }
    registry = Array.isArray(parsed.skills) ? parsed.skills : []
  }

  const report = validateSkillSet(items, registry, skillRoot)
  console.log(JSON.stringify(report, null, 2))

  const hardErrors =
    report.invalidSkills.length +
    report.registryDuplicates.length +
    report.registryPathMismatches.length +
    report.brokenRegistryFiles.length

  const warnings =
    report.duplicateNames.length +
    report.brokenChains.length +
    report.brokenSeverityBoosts.length +
    report.unknownPrerequisites.length +
    report.orphanRegistryEntries.length

  if (warnings) {
    console.warn(
      "WARN skill metadata: " +
        "duplicates=" +
        report.duplicateNames.length +
        " brokenChains=" +
        report.brokenChains.length +
        " brokenSeverity=" +
        report.brokenSeverityBoosts.length +
        " unknownPrerequisites=" +
        report.unknownPrerequisites.length +
        " orphanRegistry=" +
        report.orphanRegistryEntries.length,
    )
  }

  console.log(
    "skills=" +
      report.skillFiles +
      " unique_names=" +
      report.uniqueNames +
      " registry_entries=" +
      report.registryEntries +
      " unindexed_names=" +
      report.unindexedSkillNames.length,
  )

  if (hardErrors) process.exit(1)
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
