#!/usr/bin/env bun
// Generate the skill registry from every SKILL.md under .cyberstrike/skill.
// Entries include their relative directory path so nested skills are addressable.
import path from "path"
import { readdirSync } from "fs"
import matter from "gray-matter"

const root = path.resolve(import.meta.dir, "../../..")
const skillDir = path.join(root, ".cyberstrike", "skill")

type RegistryEntry = {
  name: string
  description: string
  path: string
  category?: string
  owasp_id?: string
  verified?: string
  tags?: string[]
  tech_stack?: string[]
  cwe_ids?: string[]
  files: string[]
}

function walkFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkFiles(absolute))
    else if (entry.isFile()) out.push(absolute)
  }
  return out
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : []
}

function fallbackDescription(name: string, content: string): string {
  const heading = content.match(/^#{1,2}\s+(.+)$/m)?.[1]?.trim()
  if (heading) return heading.replace(/^SKILL:\s*/i, "").trim()
  return name.replace(/[-_]+/g, " ").trim()
}

async function main() {
  const glob = new Bun.Glob("**/SKILL.md")
  const files = (await Array.fromAsync(
    glob.scan({
      cwd: skillDir,
      absolute: true,
      onlyFiles: true,
      followSymlinks: true,
    }),
  )).sort()

  const entries: RegistryEntry[] = []
  const seen = new Map<string, string>()

  for (const file of files) {
    const parsed = matter(await Bun.file(file).text())
    const raw = parsed.data as Record<string, unknown>
    const relativeFile = path.relative(skillDir, file).split(path.sep).join("/")
    const relativeDir = path.posix.dirname(relativeFile)
    const name =
      typeof raw.name === "string" && raw.name.trim().length > 0
        ? raw.name.trim()
        : path.posix.basename(relativeDir)

    if (!name) throw new Error("Skill has no usable name: " + relativeFile)
    const previous = seen.get(name)
    if (previous) throw new Error('Duplicate skill name "' + name + '": ' + previous + " and " + relativeFile)
    seen.set(name, relativeFile)

    const description =
      typeof raw.description === "string" && raw.description.trim().length > 0
        ? raw.description.trim()
        : fallbackDescription(name, parsed.content)

    const dir = path.dirname(file)
    const filesInSkill = walkFiles(dir)
      .map((candidate) => path.relative(dir, candidate).split(path.sep).join("/"))
      .sort()

    entries.push({
      name,
      description,
      path: relativeDir === "." ? "" : relativeDir,
      category: typeof raw.category === "string" ? raw.category : undefined,
      owasp_id: typeof raw.owasp_id === "string" ? raw.owasp_id : undefined,
      verified:
        typeof raw.signed_by === "string"
          ? "official"
          : typeof raw.verified === "string"
            ? raw.verified
            : "unverified",
      tags: asStringArray(raw.tags),
      tech_stack: asStringArray(raw.tech_stack),
      cwe_ids: asStringArray(raw.cwe_ids),
      files: filesInSkill,
    })
  }

  entries.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path))
  const output = path.join(skillDir, "index.json")
  await Bun.write(output, JSON.stringify({ version: "2.0", skills: entries }, null, 2) + "\n")

  console.log("Generated " + output)
  console.log("  " + entries.length + " skills indexed")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
