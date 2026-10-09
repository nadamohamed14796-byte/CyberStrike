import { createHash } from "node:crypto"
import path from "node:path"
import { acceptedClasses, falsePositives, findings } from "./notes"

export type WriteupClass = string

export type WriteupIndex = {
  count: number
  classes: Record<WriteupClass, number>
  items: Array<{ title: string; path: string; class: WriteupClass | null; hash: string }>
}

const rules: Array<[string, RegExp]> = [
  ["idor", /\b(?:idor|bola)\b|object[- ]level authorization|insecure direct object reference/i],
  ["ssrf", /\bssrf\b|server[- ]side request forgery/i],
  ["xss", /\bxss\b|cross[- ]site scripting|cross site scripting/i],
  ["sqli", /\bsqli\b|sql injection/i],
  ["ssti", /\bssti\b|server[- ]side template injection/i],
  ["csrf", /\bcsrf\b|cross[- ]site request forgery/i],
  ["xxe", /\bxxe\b|xml external entit(?:y|ies)/i],
  ["rce", /\brce\b|remote code execution/i],
  ["lfi", /\blfi\b|local file inclusion/i],
  ["rfi", /\brfi\b|remote file inclusion/i],
  ["open-redirect", /open redirect(?:ion)?/i],
  ["auth-bypass", /authentication bypass|authorization bypass/i],
  ["business-logic", /business[- ]logic flaw|business logic vulnerability/i],
]

function classify(text: string): WriteupClass | null {
  return rules.find(([, pattern]) => pattern.test(text))?.[0] ?? null
}

function titleOf(file: string, content: string) {
  return content.match(/^#{1,2}\s+(.+)$/m)?.[1]?.trim() || path.basename(file)
}

async function indexWriteups(directory: string): Promise<WriteupIndex> {
  const items: WriteupIndex["items"] = []
  const seen = new Set<string>()
  const glob = new Bun.Glob("**/*")
  for await (const file of glob.scan({ cwd: directory, absolute: true, onlyFiles: true })) {
    if (!/\.(?:md|mdx|txt)$/i.test(file)) continue
    const content = await Bun.file(file).text()
    const hash = createHash("sha256").update(content).digest("hex")
    if (seen.has(hash)) continue
    seen.add(hash)
    items.push({
      title: titleOf(file, content),
      path: path.relative(directory, file).split(path.sep).join("/"),
      class: classify(path.basename(file) + "\n" + content),
      hash,
    })
  }

  items.sort((a, b) => a.path.localeCompare(b.path))
  const classes: Record<string, number> = {}
  for (const item of items) {
    if (item.class) classes[item.class] = (classes[item.class] ?? 0) + 1
  }
  return { count: items.length, classes, items }
}

export async function update(directory: string, notes?: string) {
  const root = path.resolve(directory)
  const index = await indexWriteups(root)
  const ownFindings = notes ? await findings(path.resolve(notes)) : []
  const accepted = acceptedClasses(ownFindings)
  const fp = notes ? await falsePositives(path.resolve(notes)) : []
  const realCases = new Map<string, number>()

  for (const [name, count] of Object.entries(index.classes)) realCases.set(name, count)
  for (const [name, count] of Object.entries(accepted)) realCases.set(name, (realCases.get(name) ?? 0) + count)

  const ranked = [...realCases.entries()].sort(([leftName, leftCount], [rightName, rightCount]) =>
    rightCount - leftCount || leftName.localeCompare(rightName),
  )
  const lines = ["# CyberStrike Learning Briefing", "", `Unique write-ups: ${index.count}`, ""]

  if (ranked.length) {
    lines.push("## Highest-value vulnerability classes")
    ranked.forEach(([name, count], position) => lines.push(`${position + 1}. ${name} (${count} real cases)`))
    lines.push("")
  } else {
    lines.push("No write-ups yet.", "")
  }

  if (Object.keys(accepted).length) {
    lines.push("## Accepted findings from your notes")
    for (const [name, count] of Object.entries(accepted).sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`- ${name}: ${count}`)
    }
    lines.push("")
  }

  if (fp.length) {
    lines.push("## Known false positives")
    fp.forEach((item) => lines.push(`- ${item}`))
    lines.push("")
  }

  lines.push("External write-ups are advisory references, not proof that a target is vulnerable.")
  return { index, briefing: lines.join("\n") }
}
