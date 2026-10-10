import path from "node:path"

export interface WriteupIndex {
  count: number
  classes: Record<string, number>
  writeups: Array<{ title: string; className: string; file: string; fingerprint: string }>
}

function classify(title: string, content: string): string | undefined {
  const text = (title + "\n" + content).toLowerCase()
  if (/\b(ssrf|server[- ]side request forgery)\b/.test(text)) return "ssrf"
  if (/\b(idor|bola|broken object level authorization|insecure direct object reference|object reference swap)\b/.test(text)) return "idor"
  if (/\b(sql injection|sqli)\b/.test(text)) return "sqli"
  if (/\b(cross[- ]site scripting|\bxss\b)\b/.test(text)) return "xss"
  if (/\b(\bxxe\b|xml external entity)\b/.test(text)) return "xxe"
  if (/\b(open redirect|unvalidated redirect)\b/.test(text)) return "open-redirect"
  if (/\b(command injection|rce|remote code execution)\b/.test(text)) return "rce"
  if (/\b(path traversal|directory traversal)\b/.test(text)) return "path-traversal"
  if (/\b(authentication bypass|auth bypass|broken authentication)\b/.test(text)) return "auth"
  if (/\b(csrf|cross[- ]site request forgery)\b/.test(text)) return "csrf"
  return undefined
}

function titleOf(file: string, content: string) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return heading || path.basename(file, path.extname(file)).replace(/[-_]+/g, " ")
}

function hash(value: string) {
  return new Bun.CryptoHasher("sha256").update(value.trim().replace(/\s+/g, " ")).digest("hex")
}

async function markdownFiles(root: string) {
  const glob = new Bun.Glob("**/*.md")
  const files: string[] = []
  for await (const file of glob.scan({ cwd: root, onlyFiles: true, dot: false })) {
    if (file.split(/[\\/]/).some((part) => part === ".git" || part === "node_modules")) continue
    files.push(file)
  }
  return files.sort()
}

async function readOwnNotes(notesDir: string) {
  const accepted: Record<string, number> = {}
  const falsePositives: string[] = []
  const files = await markdownFiles(notesDir).catch(() => [])
  for (const file of files) {
    const text = await Bun.file(path.join(notesDir, file)).text().catch(() => "")
    if (/\bstatus\s*:\s*accepted\b/i.test(text)) {
      const declared = text.match(/^\s*class\s*:\s*([\w-]+)/im)?.[1]?.toLowerCase()
      const className = declared || classify(titleOf(file, text), text)
      if (className) accepted[className] = (accepted[className] ?? 0) + 1
    }
    if (/\bfp\.md$/i.test(file) || /false[- ]positive/i.test(file)) {
      for (const line of text.split(/\r?\n/)) {
        const item = line.match(/^\s*[-*]\s+(.+?)\s*$/)?.[1]
        if (item) falsePositives.push(item)
      }
    }
  }
  return { accepted, falsePositives: [...new Set(falsePositives)] }
}

export async function update(root: string, notesDir?: string): Promise<{ index: WriteupIndex; briefing: string }> {
  const unique = new Map<string, WriteupIndex["writeups"][number]>()
  for (const file of await markdownFiles(root)) {
    const content = await Bun.file(path.join(root, file)).text().catch(() => "")
    if (!content.trim()) continue
    const fingerprint = hash(content)
    if (unique.has(fingerprint)) continue
    const title = titleOf(file, content)
    const className = classify(title, content)
    if (!className) continue
    unique.set(fingerprint, { title, className, file, fingerprint })
  }

  const writeups = [...unique.values()]
  const classes: Record<string, number> = {}
  for (const item of writeups) classes[item.className] = (classes[item.className] ?? 0) + 1
  const index: WriteupIndex = { count: writeups.length, classes, writeups }
  const own = notesDir ? await readOwnNotes(notesDir) : { accepted: {}, falsePositives: [] as string[] }
  const ranked = Object.entries(classes).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  const lines = ["# Agent Briefing", "", "## Research write-ups", ""]
  if (!ranked.length) lines.push("No write-ups yet.")
  else ranked.forEach(([name, count], i) => lines.push(`${i + 1}. ${name} (${count} real cases)`))
  if (Object.keys(own.accepted).length) {
    lines.push("", "## Accepted findings", "")
    for (const [name, count] of Object.entries(own.accepted).sort((a, b) => a[0].localeCompare(b[0]))) {
      lines.push(`- ${name}: ${count}`)
    }
  }
  if (own.falsePositives.length) {
    lines.push("", "## Known false positives", "")
    for (const item of own.falsePositives) lines.push(`- ${item}`)
  }
  lines.push("")
  return { index, briefing: lines.join("\n") }
}
