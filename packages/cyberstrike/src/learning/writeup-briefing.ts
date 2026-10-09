import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import path from "node:path"
import { Glob } from "bun"
import { acceptedClasses, falsePositives, findings } from "./notes"

export interface WriteupIndex {
  count: number
  classes: Record<string, number>
}

interface WriteupDocument {
  fingerprint: string
  title: string
  content: string
  vulnerabilityClass?: string
}

const CLASSIFIERS: Array<[string, RegExp]> = [
  ["idor", /\b(?:idor|bola|broken object(?: level)? authorization|insecure direct object reference|object reference swap)\b/i],
  ["ssrf", /\b(?:ssrf|server[- ]side request forgery)\b/i],
  ["xss", /\b(?:xss|cross[- ]site scripting)\b/i],
  ["sqli", /\b(?:sqli|sql injection)\b/i],
  ["rce", /\b(?:rce|remote code execution|command injection|arbitrary command execution)\b/i],
  ["ssti", /\b(?:ssti|server[- ]side template injection)\b/i],
  ["lfi", /\b(?:lfi|local file inclusion|path traversal|directory traversal)\b/i],
  ["csrf", /\b(?:csrf|cross[- ]site request forgery)\b/i],
  ["open-redirect", /\b(?:open redirect|unvalidated redirect)\b/i],
  ["xxe", /\b(?:xxe|xml external entity)\b/i],
  ["auth-bypass", /\b(?:authentication bypass|authorization bypass|broken authentication)\b/i],
  ["race-condition", /\b(?:race condition|toctou)\b/i],
  ["file-upload", /\b(?:unrestricted file upload|arbitrary file upload|file upload vulnerability)\b/i],
]

function fingerprint(content: string) {
  const canonical = content.replace(/\r\n?/g, "\n").split("\n").map(line => line.trimEnd()).join("\n").trim()
  return createHash("sha256").update(canonical, "utf8").digest("hex")
}

function titleOf(content: string, file: string) {
  const heading = content.split(/\r?\n/).find(line => /^#\s+/.test(line))
  return heading ? heading.replace(/^#\s+/, "").trim() : path.basename(file, path.extname(file))
}

function classify(content: string) {
  const normalized = content.replace(/[_-]+/g, " ")
  return CLASSIFIERS.find(([, pattern]) => pattern.test(normalized))?.[0]
}

async function readWriteups(directory: string): Promise<WriteupDocument[]> {
  if (!existsSync(directory)) return []
  const files = Array.from(new Glob("**/*.md").scanSync({ cwd: directory })).sort()
  const unique = new Map<string, WriteupDocument>()
  for (const relative of files) {
    const file = path.join(directory, relative)
    let content: string
    try {
      content = await Bun.file(file).text()
    } catch (error) {
      throw new Error("WRITEUP_READ_FAILED: " + file + ": " + (error instanceof Error ? error.message : String(error)))
    }
    const key = fingerprint(content)
    if (unique.has(key)) continue
    unique.set(key, {
      fingerprint: key,
      title: titleOf(content, file),
      content,
      vulnerabilityClass: classify(content),
    })
  }
  return [...unique.values()]
}

/**
 * Build a deterministic briefing from a local directory of Markdown write-ups.
 * Identical normalized documents are counted once. Public write-ups are
 * reference material; a category is never treated as a confirmed target finding.
 */
export async function update(directory: string, notesDirectory?: string): Promise<{ index: WriteupIndex; briefing: string }> {
  const root = path.resolve(directory)
  const documents = await readWriteups(root)
  const classes: Record<string, number> = {}
  for (const document of documents) {
    if (!document.vulnerabilityClass) continue
    classes[document.vulnerabilityClass] = (classes[document.vulnerabilityClass] ?? 0) + 1
  }
  const index: WriteupIndex = { count: documents.length, classes }

  const ownFindings = notesDirectory ? await findings(path.resolve(notesDirectory)) : []
  const accepted = acceptedClasses(ownFindings)
  const falsePositiveNotes = notesDirectory ? await falsePositives(path.resolve(notesDirectory)) : []
  const ranking = [...new Set([...Object.keys(classes), ...Object.keys(accepted)])]
    .map(name => ({ name, count: (classes[name] ?? 0) + (accepted[name] ?? 0) }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  const lines = [
    "# CyberStrike Learning Briefing",
    "",
    "Priorities are ranked from deduplicated public write-ups and accepted findings in your local notes. Public write-ups are advisory references, not evidence that a target is vulnerable.",
    "",
  ]

  if (documents.length === 0) {
    lines.push("No write-ups yet.", "")
  } else {
    lines.push("## Write-up inventory", "", `- Unique write-ups: ${documents.length}`, "")
  }

  if (ranking.length) {
    lines.push("## Priority classes", "")
    ranking.forEach((item, index) => lines.push(`${index + 1}. ${item.name} (${item.count} real cases)`))
    lines.push("")
  }

  const ownClasses = Object.entries(accepted).sort((a, b) => a[0].localeCompare(b[0]))
  if (ownClasses.length) {
    lines.push("## Accepted findings from your notes", "")
    for (const [name, count] of ownClasses) lines.push(`- ${name}: ${count}`)
    lines.push("")
  }

  if (falsePositiveNotes.length) {
    lines.push("## Known false positives", "")
    for (const note of falsePositiveNotes) lines.push(`- ${note}`)
    lines.push("")
  }

  if (documents.length) {
    lines.push("## Indexed write-ups", "")
    for (const document of documents) {
      if (document.vulnerabilityClass) {
        lines.push(`- [${document.vulnerabilityClass}] ${document.title}`)
      } else {
        lines.push(`- [unclassified] ${document.title}`)
      }
    }
    lines.push("")
  }

  return { index, briefing: lines.join("\n") }
}
