import path from "path"
import { Glob } from "bun"
import { findings, falsePositives, acceptedClasses } from "./notes"

// Offline learning pipeline: writeups -> process -> learn -> briefing.
// Input is a local folder of markdown write-ups. Output is a JSON index
// (learning.json) and an agent-briefing.md that agents read at session start.

const CLASSES: Record<string, string[]> = {
  idor: ["idor", "bola", "object reference", "insecure direct"],
  authz: ["authorization", "privilege escalation", "broken access", "forced browsing"],
  authn: ["authentication bypass", "password reset", "mfa", "2fa", "session fixation"],
  ssrf: ["ssrf", "server-side request forgery"],
  injection: ["sql injection", "sqli", "command injection", "ssti", "xxe"],
  xss: ["xss", "cross-site scripting"],
  logic: ["business logic", "race condition", "price manipulation", "coupon"],
  upload: ["file upload", "unrestricted upload", "path traversal", "lfi"],
  oauth: ["oauth", "redirect_uri", "open redirect"],
  takeover: ["subdomain takeover", "dangling cname"],
}

export type Writeup = {
  id: string
  title: string
  classes: string[]
  length: number
}

export type Index = {
  count: number
  classes: Record<string, number>
  writeups: Writeup[]
}

// Stable id from content so re-running the pipeline never duplicates entries.
function hash(text: string) {
  return Bun.hash(text).toString(16)
}

// Whole-word match so short keywords like "lfi" or "mfa" do not hit inside
// other words ("self", "modified").
function classify(text: string) {
  return Object.entries(CLASSES)
    .filter(([, words]) => words.some((word) => new RegExp(`\\b${word}\\b`, "i").test(text)))
    .map(([name]) => name)
}

function titleOf(text: string, fallback: string) {
  const heading = text.split("\n").find((line) => line.startsWith("# "))
  return heading ? heading.slice(2).trim() : fallback
}

// Process: read every markdown writeup, dedupe by content hash, classify.
export async function process(dir: string): Promise<Writeup[]> {
  const files = Array.from(new Glob("**/*.md").scanSync({ cwd: dir }))
  const seen = new Set<string>()
  const out: Writeup[] = []
  for (const file of files) {
    const text = await Bun.file(path.join(dir, file)).text()
    const id = hash(text)
    if (seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      title: titleOf(text, path.basename(file, ".md")),
      classes: classify(text),
      length: text.length,
    })
  }
  return out
}

// Learn: aggregate which vulnerability classes show up most in real cases.
export function learn(writeups: Writeup[]): Index {
  const classes: Record<string, number> = {}
  for (const writeup of writeups) {
    for (const name of writeup.classes) classes[name] = (classes[name] ?? 0) + 1
  }
  return { count: writeups.length, classes, writeups }
}

// Briefing: the file agents read first. Ranks classes by how often they appear.
export function briefing(index: Index, own: { accepted: Record<string, number>; fp: string[] } = { accepted: {}, fp: [] }) {
  const merged: Record<string, number> = { ...index.classes }
  for (const [name, n] of Object.entries(own.accepted)) merged[name] = (merged[name] ?? 0) + n
  const ranked = Object.entries(merged).sort((a, b) => b[1] - a[1])
  const priorities = ranked.map(([name, n], i) => `${i + 1}. ${name} (${n} real cases)`).join("\n")
  return [
    "# Agent Briefing",
    "",
    `Built from ${index.count} real write-ups. Rebuild with the update pipeline.`,
    "",
    "## Hunt Priorities (by real-case frequency)",
    priorities || "No write-ups yet.",
    "",
    "## Your Accepted Findings (weighted into priorities above)",
    Object.keys(own.accepted).length ? Object.entries(own.accepted).map(([n, c]) => `- ${n}: ${c}`).join("\n") : "None recorded yet.",
    "",
    "## Known False Positives (do NOT report these)",
    own.fp.length ? own.fp.map((item) => `- ${item}`).join("\n") : "None recorded yet.",
    "",
    "## Rules",
    "- Follow the FP Gate before reporting. A lead is not a finding.",
    "- Stay in scope. Confirm scope before any offensive action.",
    "- Impact order: identity > money > trust boundaries.",
    "",
  ].join("\n")
}

// Run the whole pipeline: returns the index and the briefing text.
export async function update(dir: string, notes?: string) {
  const index = learn(await process(dir))
  const own = notes
    ? { accepted: acceptedClasses(await findings(notes)), fp: await falsePositives(notes) }
    : { accepted: {}, fp: [] }
  return { index, briefing: briefing(index, own) }
}
