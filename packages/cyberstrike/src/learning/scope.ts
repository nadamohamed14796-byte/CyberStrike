import { existsSync } from "fs"

// Decides whether a host is in scope, from a scope.md file.
// Entry forms supported:
//   example.com          exact host only
//   *.example.com        any subdomain, NOT the apex
//   example.com (with subdomains: yes)  apex plus subdomains
//   *.com                any host under a TLD (only if the program says so)
//   10.0.0.0/24          CIDR range (IPv4)
//   https://app.example.com/api/*   host plus path prefix
//   Company Name         a name, not a host: result is "unknown" until a domain is added
// Out-of-scope always wins over in-scope.

export type Verdict = "in" | "out" | "unknown"

type Entry = { raw: string; host: string; path: string | null; cidr: [number, number] | null; wildcard: boolean; subs: boolean; name: boolean }

function ipToInt(ip: string) {
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null
  return parts.reduce((acc, p) => acc * 256 + p, 0)
}

export function parseEntry(raw: string): Entry {
  const text = raw.trim()
  const subs = /subdomains:\s*yes/i.test(text)
  const clean = text.replace(/\s*\(.*\)\s*$/, "").trim()
  const url = clean.match(/^https?:\/\/([^/]+)(\/.*)?$/i)
  const target = url ? url[1] : clean
  const path = url && url[2] ? url[2].replace(/\*$/, "") : null
  const cidr = target.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/)
  if (cidr) {
    const base = ipToInt(cidr[1])
    const bits = Number(cidr[2])
    if (base === null || bits < 0 || bits > 32) return { raw, host: target, path, cidr: null, wildcard: false, subs, name: true }
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
    return { raw, host: target, path, cidr: [(base & mask) >>> 0, mask], wildcard: false, subs, name: false }
  }
  const looksLikeHost = /^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)*$/i.test(target)
  if (!looksLikeHost) return { raw, host: target.toLowerCase(), path, cidr: null, wildcard: false, subs, name: true }
  const wildcard = target.startsWith("*.")
  return { raw, host: (wildcard ? target.slice(2) : target).toLowerCase(), path, cidr: null, wildcard, subs, name: false }
}

function matches(entry: Entry, host: string, urlPath: string) {
  if (entry.name) return false
  if (entry.cidr) {
    const ip = ipToInt(host)
    if (ip === null) return false
    return ((ip & entry.cidr[1]) >>> 0) === entry.cidr[0]
  }
  const h = host.toLowerCase()
  const apex = h === entry.host
  const sub = h.endsWith("." + entry.host)
  const hostOk = entry.wildcard ? sub : apex || (entry.subs && sub)
  if (!hostOk) return false
  if (entry.path && !urlPath.startsWith(entry.path.replace(/\/$/, ""))) return false
  return true
}

export function verdict(inScope: string[], outOfScope: string[], host: string, urlPath = "/"): Verdict {
  const outs = outOfScope.map(parseEntry)
  if (outs.some((e) => matches(e, host, urlPath))) return "out"
  const ins = inScope.map(parseEntry)
  if (ins.some((e) => matches(e, host, urlPath))) return "in"
  return "unknown"
}

// Read the two lists from a scope.md file. Anything not in the lists is unknown.
export async function load(file: string) {
  if (!existsSync(file)) return { inScope: [] as string[], outOfScope: [] as string[], names: [] as string[] }
  const text = await Bun.file(file).text()
  const lines = text.split("\n")
  const inScope: string[] = []
  const outOfScope: string[] = []
  let section: "in" | "out" | null = null
  for (const line of lines) {
    if (/^in_scope:/.test(line)) section = "in"
    else if (/^out_of_scope:/.test(line)) section = "out"
    else if (/^\S/.test(line)) section = null
    else if (/^\s+-\s+/.test(line) && section) {
      const value = line.replace(/^\s+-\s+/, "").trim()
      if (section === "in") inScope.push(value)
      else outOfScope.push(value)
    }
  }
  const names = inScope.map(parseEntry).filter((e) => e.name).map((e) => e.raw)
  return { inScope, outOfScope, names }
}
