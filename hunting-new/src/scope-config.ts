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
        const value = scalar(item[1])
        if (!value) throw new Error("SCOPE_CONFIG_INVALID: rule value must not be empty")
        current = { value }
        rules.push(current as ScopeRule)
        continue
      }
      const property = line.match(/^\s{6}([a-zA-Z_][\w-]*):\s*(.*?)\s*$/)
      if (property && current) {
        const [, key, rawValue] = property
        if (key === "value") {
          const value = scalar(rawValue)
          if (!value) throw new Error("SCOPE_CONFIG_INVALID: rule value must not be empty")
          current.value = value
        } else if (key === "path") {
          const value = scalar(rawValue)
          if (!value.startsWith("/")) throw new Error("SCOPE_CONFIG_INVALID: rule path must start with /")
          current.path = value
        } else if (key === "exclude") {
          if (rawValue !== "true" && rawValue !== "false") throw new Error("SCOPE_CONFIG_INVALID: exclude must be true or false")
          current.exclude = rawValue === "true"
        } else if (key === "protocols" || key === "ports") {
          const listText = rawValue.trim()
          if (!listText.startsWith("[") || !listText.endsWith("]")) throw new Error("SCOPE_CONFIG_INVALID: " + key + " must be a non-empty inline list")
          const values = listText.slice(1, -1).split(",").map(scalar).filter(Boolean)
          if (!values.length) throw new Error("SCOPE_CONFIG_INVALID: " + key + " must not be empty")
          if (key === "protocols") {
            if (values.some(value => value !== "http" && value !== "https")) throw new Error("SCOPE_CONFIG_INVALID: protocols must contain only http or https")
            current.protocols = values
          } else {
            const ports = values.map(Number)
            if (ports.some(port => !Number.isInteger(port) || port < 1 || port > 65535)) throw new Error("SCOPE_CONFIG_INVALID: ports must be integers between 1 and 65535")
            current.ports = ports
          }
        } else {
          throw new Error("SCOPE_CONFIG_INVALID: unsupported scope rule field " + key)
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
