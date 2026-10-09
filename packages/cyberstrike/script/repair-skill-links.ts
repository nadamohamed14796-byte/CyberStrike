#!/usr/bin/env bun
/**
 * Conservative repair of relative Markdown links inside .cyberstrike/skill.
 *
 * It only rewrites a link when the destination can be resolved exactly or
 * when one unique repository file has the same basename. Ambiguous/missing
 * destinations are reported, never replaced with placeholder files.
 *
 * Usage:
 *   bun run packages/cyberstrike/script/repair-skill-links.ts --apply
 *   bun run packages/cyberstrike/script/repair-skill-links.ts --check
 */
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const SKILL_ROOT = path.join(ROOT, ".cyberstrike", "skill")
const apply = process.argv.includes("--apply")
const check = process.argv.includes("--check")
type Issue = { file: string; line: number; link: string; status: string; candidate?: string }
const issues: Issue[] = []
const markdownFiles: string[] = []
const allFiles: string[] = []

function walk(dir: string) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(abs)
    else if (ent.isFile()) {
      const rel = path.relative(ROOT, abs).split(path.sep).join("/")
      allFiles.push(rel)
      if (ent.name.toLowerCase().endsWith(".md") || ent.name.toLowerCase().endsWith(".mdx")) markdownFiles.push(rel)
    }
  }
}
function normalize(p: string) {
  return path.posix.normalize(p.replaceAll("\\", "/")).replace(/^\.\//, "")
}
function existsRepoPath(rel: string) {
  const safe = normalize(rel)
  return !safe.startsWith("../") && fs.existsSync(path.join(ROOT, safe)) && fs.statSync(path.join(ROOT, safe)).isFile()
}
function linkDestination(raw: string) {
  let value = raw.trim()
  if (!value || value.startsWith("<") && value.endsWith(">")) value = value.slice(1, -1)
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) return null
  const suffixAt = value.search(/[?#]/)
  const suffix = suffixAt >= 0 ? value.slice(suffixAt) : ""
  const pathname = (suffixAt >= 0 ? value.slice(0, suffixAt) : value).trim()
  if (!pathname) return null
  try { return { pathname: decodeURIComponent(pathname), suffix } } catch { return { pathname, suffix } }
}
function resolveTarget(source: string, target: string) {
  const parsed = linkDestination(target)
  if (!parsed) return { status: "external-or-anchor" as const }
  const sourceDir = path.posix.dirname(source)
  const raw = parsed.pathname.startsWith("/")
    ? parsed.pathname.slice(1)
    : path.posix.join(sourceDir, parsed.pathname)
  const candidate = normalize(raw)
  const variants = [candidate]
  if (!path.posix.extname(candidate)) {
    variants.push(candidate + ".md", candidate + ".mdx", path.posix.join(candidate, "README.md"), path.posix.join(candidate, "SKILL.md"))
  }
  const exact = variants.find(existsRepoPath)
  if (exact) return { status: "resolved" as const, replacement: path.posix.relative(sourceDir, exact) + parsed.suffix }
  const lower = candidate.toLowerCase()
  const caseMatches = allFiles.filter(f => f.toLowerCase() === lower)
  if (caseMatches.length === 1) return { status: "case-only" as const, replacement: path.posix.relative(sourceDir, caseMatches[0]) + parsed.suffix }
  const base = path.posix.basename(parsed.pathname).toLowerCase()
  const basenameMatches = allFiles.filter(f => path.posix.basename(f).toLowerCase() === base)
  if (basenameMatches.length === 1) return { status: "unique-basename" as const, replacement: path.posix.relative(sourceDir, basenameMatches[0]) + parsed.suffix }
  if (caseMatches.length > 1 || basenameMatches.length > 1) return { status: "ambiguous" as const, candidates: basenameMatches.slice(0, 8) }
  return { status: "missing" as const }
}

walk(SKILL_ROOT)
allFiles.sort()
markdownFiles.sort()
const stats = { scannedMarkdown: markdownFiles.length, links: 0, alreadyValid: 0, repaired: 0, unresolved: 0, ambiguous: 0, changedFiles: 0 }
for (const rel of markdownFiles) {
  const abs = path.join(ROOT, rel)
  const original = fs.readFileSync(abs, "utf8")
  let updated = original
  // Inline links/images; avoid fenced code blocks to prevent changing examples.
  const lines = updated.split("\n")
  let inFence = false
  let changed = false
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) { inFence = !inFence; continue }
    if (inFence) continue
    lines[i] = lines[i].replace(/(!?\[[^\]]*\]\()(<[^>]+>|[^\s)]+)(\s+(?:"[^"]*"|'[^']*'))?(\))/g, (whole, prefix: string, dest: string, title: string | undefined, close: string) => {
      const line = i + 1
      stats.links++
      const result = resolveTarget(rel, dest)
      if (result.status === "external-or-anchor" || result.status === "resolved") { stats.alreadyValid++; return whole }
      if ("replacement" in result && result.replacement) {
        stats.repaired++
        issues.push({ file: rel, line, link: dest, status: result.status, candidate: result.replacement })
        changed = true
        return prefix + result.replacement + (title ?? "") + close
      }
      stats.unresolved++
      if (result.status === "ambiguous") stats.ambiguous++
      issues.push({ file: rel, line, link: dest, status: result.status, ...("candidates" in result ? { candidate: result.candidates.join("; ") } : {}) })
      return whole
    })
  }
  if (changed && apply) { fs.writeFileSync(abs, lines.join("\n")); stats.changedFiles++ }
}
const report = { mode: apply ? "apply" : check ? "check" : "report", ...stats, unresolvedSamples: issues.filter(x => x.status === "missing" || x.status === "ambiguous").slice(0, 100), repairedSamples: issues.filter(x => x.status === "case-only" || x.status === "unique-basename").slice(0, 100) }
console.log(JSON.stringify(report, null, 2))
if (check && stats.unresolved > 0) process.exitCode = 1
