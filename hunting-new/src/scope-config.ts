import path from "node:path"
import type { ScopeRule } from "./scope"

function scalar(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "")
}

export async function loadConfiguredScope(root: string): Promise<ScopeRule[]> {
  const file = Bun.file(path.join(root, "config", "scope.yaml"))
  if (!(await file.exists())) return []
  const source = await file.text()
  const rules: ScopeRule[] = []
  const exclusions: string[] = []
  let section: "rules" | "exclusions" | "" = ""
  let current: Partial<ScopeRule> | undefined

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, "")
    if (!line.trim()) continue
    if (/^\s{2}rules:\s*(?:\[\])?\s*$/.test(line)) { section = "rules"; current = undefined; continue }
    if (/^\s{2}exclusions:\s*(?:\[\])?\s*$/.test(line)) { section = "exclusions"; current = undefined; continue }
    if (/^\s{2}[a-zA-Z_][\w-]*:/.test(line)) { section = ""; current = undefined; continue }

    if (section === "rules") {
      const item = line.match(/^\s{4}-\s*value:\s*(.+?)\s*$/)
      if (item) {
        current = { value: scalar(item[1]) }
        rules.push(current as ScopeRule)
        continue
      }
      const property = line.match(/^\s{6}([a-zA-Z_][\w-]*):\s*(.*?)\s*$/)
      if (property && current) {
        const [, key, rawValue] = property
        if (key === "value" && rawValue) current.value = scalar(rawValue)
        else if (key === "path") current.path = scalar(rawValue)
        else if (key === "exclude") current.exclude = rawValue === "true"
        else if (key === "protocols" || key === "ports") {
          const values = rawValue.replace(/^\[|\]$/g, "").split(",").map(scalar).filter(Boolean)
          if (key === "protocols") current.protocols = values
          else current.ports = values.map(Number).filter(Number.isInteger)
        }
      }
    } else if (section === "exclusions") {
      const item = line.match(/^\s{4}-\s*(.+?)\s*$/)
      if (item) exclusions.push(scalar(item[1]))
    }
  }

  for (const value of exclusions) rules.push({ value, exclude: true })
  return rules.filter(rule => typeof rule.value === "string" && rule.value.length > 0)
}
