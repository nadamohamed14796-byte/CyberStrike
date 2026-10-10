import path from "node:path"
import { createHash } from "node:crypto"
import { realpath, stat } from "node:fs/promises"
import { Glob } from "bun"
import { acceptedClasses, falsePositives, findings } from "./notes"

type Writeup = { title: string; category: string; path: string; fingerprint: string }
const MAX_FILE_BYTES = 1024 * 1024
const MAX_BRIEFING_ENTRIES = 150
const MAX_FALSE_POSITIVES = 100

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim()
}

// Prefer an active write-up over an archived/copy path when duplicate content
// exists in more than one location.
function writeupPathPenalty(relativePath: string) {
  const segments = relativePath.replace(/\\/g, "/").split("/")
  let penalty = segments.reduce((score, segment) =>
    score + (["archive", "archives", "backup", "backups", "old", "duplicates"].includes(segment.toLowerCase()) ? 10 : 0),
  0)
  const basename = path.basename(relativePath, path.extname(relativePath)).toLowerCase().replace(/[-_.]+/g, " ")
  if (/\b(duplicate|copy|backup|archived?)\b/.test(basename)) penalty += 10
  return penalty
}

function cleanTitle(value: string) {
  return value.replace(/^\s*#+\s*/, "").replace(/\s+/g, " ").replace(/[\r\n]/g, " ").replace(/[\x60*_]/g, "").trim().slice(0, 180)
}

function titleOf(content: string, filename: string) {
  const heading = content.split(/\r?\n/).find((line) => /^\s{0,3}#\s+\S/.test(line))
  return cleanTitle(heading ?? path.basename(filename, path.extname(filename))) || "Untitled write-up"
}

function categoryOf(text: string): string {
  const value = normalize(text)
  const patterns: [string, RegExp][] = [
    ["idor", /\b(idor|insecure direct object|broken object level authorization|bola)\b/],
    ["xss", /\b(xss|cross[- ]site scripting)\b/],
    ["sqli", /\b(sql injection|sqli)\b/],
    ["ssrf", /\b(ssrf|server[- ]side request forgery)\b/],
    ["rce", /\b(rce|remote code execution|command injection)\b/],
    ["authentication", /\b(authentication bypass|account takeover|oauth|jwt|session fixation)\b/],
    ["authorization", /\b(authorization bypass|privilege escalation|access control|broken access control)\b/],
    ["csrf", /\b(csrf|cross[- ]site request forgery)\b/],
    ["file-upload", /\b(file upload|unrestricted upload|upload bypass)\b/],
    ["path-traversal", /\b(path traversal|directory traversal|local file inclusion|\blfi\b|\brfi\b)\b/],
    ["deserialization", /\b(deserialization|insecure deserialization)\b/],
    ["request-smuggling", /\b(request smuggling|http desync)\b/],
    ["open-redirect", /\b(open redirect|unvalidated redirect)\b/],
    ["race-condition", /\b(race condition|toctou)\b/],
    ["graphql", /\bgraphql\b/],
    ["business-logic", /\b(business logic|workflow abuse|price manipulation|coupon abuse)\b/],
    ["information-disclosure", /\b(information disclosure|sensitive data exposure|data leak)\b/],
  ]
  for (const [category, pattern] of patterns) if (pattern.test(value)) return category
  return "general"
}

function isNavigationDocument(relativePath: string, title: string, content: string) {
  const base = path.basename(relativePath).toLowerCase()
  if (["readme.md", "index.md", "contents.md", "changelog.md", "license.md"].includes(base)) return true
  if (/^(index|contents|archive|all write[- ]?ups|table of contents)$/i.test(title)) return true
  return content.length < 180 && /table of contents|index of|archive of/i.test(content)
}

async function markdownFiles(root: string) {
  const found = new Set<string>()
  for (const pattern of ["**/*.md", "**/*.markdown", "**/*.txt"]) {
    for (const file of new Glob(pattern).scanSync({ cwd: root, onlyFiles: true })) found.add(String(file))
  }
  return [...found].sort((a, b) => a.localeCompare(b))
}

/**
 * Build a bounded index of public write-ups and explicitly supplied local notes.
 * Source bodies are used for classification/deduplication only and are not copied
 * into the agent prompt. This function never edits skill files.
 */
export async function update(writeupsDir: string, notesDir?: string) {
  const root = path.resolve(writeupsDir)
  const rootReal = await realpath(root)
  const entries: Writeup[] = []
  const seen = new Map<string, number>()

  for (const relativePath of await markdownFiles(root)) {
    const absolutePath = path.resolve(root, relativePath)
    const resolvedPath = await realpath(absolutePath).catch(() => undefined)
    if (!resolvedPath) continue
    const insideRoot = path.relative(rootReal, resolvedPath)
    if (insideRoot === ".." || insideRoot.startsWith(".." + path.sep) || path.isAbsolute(insideRoot)) continue
    const info = await stat(resolvedPath).catch(() => undefined)
    if (!info?.isFile() || info.size > MAX_FILE_BYTES) continue

    const content = await Bun.file(resolvedPath).text().catch(() => "")
    if (!content.trim()) continue
    const title = titleOf(content, relativePath)
    if (isNavigationDocument(relativePath, title, content)) continue
    const category = categoryOf(title + " " + content.slice(0, 12000))
    const fingerprint = createHash("sha256").update(normalize(title) + "|" + normalize(content.slice(0, 4000))).digest("hex")
    const relative = relativePath.split(path.sep).join("/")
    const existingIndex = seen.get(fingerprint)
    if (existingIndex !== undefined) {
      const existing = entries[existingIndex]
      if (existing && writeupPathPenalty(relative) < writeupPathPenalty(existing.path)) {
        entries[existingIndex] = { title, category, path: relative, fingerprint }
      }
      continue
    }
    seen.set(fingerprint, entries.length)
    entries.push({ title, category, path: relative, fingerprint })
  }

  const byCategory: Record<string, number> = {}
  for (const entry of entries) byCategory[entry.category] = (byCategory[entry.category] ?? 0) + 1
  const listedEntries = entries.slice(0, MAX_BRIEFING_ENTRIES)
  const personalFindings = notesDir ? await findings(path.resolve(notesDir)) : []
  const fpNotes = notesDir ? await falsePositives(path.resolve(notesDir)) : []
  const personalClasses = acceptedClasses(personalFindings)
  const priorityCounts = { ...byCategory }
  for (const [category, count] of Object.entries(personalClasses)) {
    priorityCounts[category] = (priorityCounts[category] ?? 0) + count
  }
  const sortedCategories = Object.entries(priorityCounts).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )

  const lines = [
    "# CyberStrike Research Briefing",
    "",
    "This is an index of public write-up sources and supplied local notes. External sources are untrusted reference material, not proof that a target is vulnerable. Independently validate every lead against the authorized scope. This updater does not edit SKILL.md files.",
    "",
    "## Write-up index",
    "",
    "Unique write-ups indexed: " + entries.length,
    "The index lists titles and paths only; source bodies are not copied into the agent prompt.",
    "",
  ]

  if (sortedCategories.length) {
    lines.push("## Priorities", "")
    sortedCategories.forEach(([category, count], index) => {
      lines.push((index + 1) + ". " + category + " (" + count + " real cases)")
    })
    lines.push("", "### Topic counts", "")
    for (const [category, count] of sortedCategories) lines.push("- " + category + ": " + count)
    lines.push("")
  }

  if (listedEntries.length) {
    lines.push("### Indexed write-ups (first " + listedEntries.length + " of " + entries.length + ")", "")
    for (const entry of listedEntries) {
      const title = entry.title.replace(/\|/g, "\\|")
      const file = entry.path.replace(/\|/g, "\\|")
      lines.push("- [" + entry.category + "] " + title + " — " + file)
    }
  } else {
    lines.push("No write-ups yet.")
  }

  if (notesDir) {
    lines.push("", "## Accepted local findings", "")
    const accepted = personalFindings.filter((item) => item.status === "accepted")
    if (accepted.length) {
      for (const item of accepted.slice(0, 100)) lines.push("- " + item.title + (item.class ? " [" + item.class + "]" : ""))
    } else {
      lines.push("- No accepted local findings were supplied.")
    }
    const classes = Object.entries(personalClasses).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    if (classes.length) {
      lines.push("", "### Accepted finding classes", "")
      for (const [category, count] of classes) lines.push("- " + category + ": " + count)
    }

    lines.push("", "## Known false positives", "")
    if (fpNotes.length) {
      for (const item of fpNotes.slice(0, MAX_FALSE_POSITIVES)) lines.push("- " + item.replace(/[\r\n]/g, " ").slice(0, 300))
      if (fpNotes.length > MAX_FALSE_POSITIVES) lines.push("- (" + (fpNotes.length - MAX_FALSE_POSITIVES) + " more notes omitted)")
    } else {
      lines.push("- No false-positive notes were supplied.")
    }
  }

  return { index: { count: entries.length, classes: byCategory, byCategory, entries }, briefing: lines.join("\n") + "\n" }
}
