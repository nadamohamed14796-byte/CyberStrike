import path from "path"
import { existsSync } from "fs"
import { Glob } from "bun"

// Your own notes, read from a local folder you control:
//   <notes>/findings/*.md   one file per finding, with status and class lines
//   <notes>/fp.md           known false positives, one bullet each
// Nothing here is fetched from the internet; it stays on your disk.

export type Finding = {
  title: string
  status: "accepted" | "fp" | "duplicate" | "unknown"
  class: string | null
}

function field(text: string, key: string) {
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, "im"))
  return match ? match[1].trim() : null
}

function statusOf(text: string): Finding["status"] {
  const value = (field(text, "status") ?? "").toLowerCase()
  if (value === "accepted" || value === "fp" || value === "duplicate") return value
  return "unknown"
}

// Read every finding file. Missing folder or file is not an error: it just
// means you have not written notes yet.
export async function findings(notes: string): Promise<Finding[]> {
  const dir = path.join(notes, "findings")
  if (!existsSync(dir)) return []
  const files = Array.from(new Glob("**/*.md").scanSync({ cwd: dir }))
  const out: Finding[] = []
  for (const file of files) {
    const text = await Bun.file(path.join(dir, file)).text()
    const heading = text.split("\n").find((line) => line.startsWith("# "))
    out.push({
      title: heading ? heading.slice(2).trim() : path.basename(file, ".md"),
      status: statusOf(text),
      class: field(text, "class"),
    })
  }
  return out
}

// Known false positives: each bullet is something not to report again.
export async function falsePositives(notes: string): Promise<string[]> {
  const file = path.join(notes, "fp.md")
  if (!existsSync(file)) return []
  const text = await Bun.file(file).text()
  return text
    .split("\n")
    .filter((line) => line.trimStart().startsWith("- "))
    .map((line) => line.trimStart().slice(2).trim())
}

// Your accepted findings count as real cases for the ranking, so the briefing
// reflects what your own triage actually accepted.
export function acceptedClasses(list: Finding[]) {
  const counts: Record<string, number> = {}
  for (const item of list) {
    if (item.status !== "accepted" || !item.class) continue
    counts[item.class] = (counts[item.class] ?? 0) + 1
  }
  return counts
}
