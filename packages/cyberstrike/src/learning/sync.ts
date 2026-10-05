import path from "path"
import os from "os"
import fs from "fs/promises"
import { existsSync } from "fs"
import { update } from "./index"

// Internet sources for real write-ups. Each one is a public git repo, so
// reads go through the normal git proxy, not through arbitrary web requests.
// Add a source by adding one entry here.
export const SOURCES = [
  { name: "hackerone-reports", url: "https://github.com/reddelexc/hackerone-reports" },
  { name: "ngalongc-bug-bounty-reference", url: "https://github.com/ngalongc/bug-bounty-reference" },
  { name: "devanshbatham-awesome-bugbounty-writeups", url: "https://github.com/devanshbatham/Awesome-Bugbounty-Writeups" },
] as const

export type Source = (typeof SOURCES)[number]

// Cache lives outside the project so it is never committed.
export function cacheDir() {
  return path.join(process.env.CYBERSTRIKE_LEARNING_DIR ?? path.join(os.homedir(), ".cyberstrike", "learning"), "sources")
}

async function git(args: string[], cwd?: string) {
  const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" })
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (code !== 0) throw new Error(`git ${args[0]} failed: ${err.trim()}`)
  return out.trim()
}

// Clone once, then fast-forward on later runs. Returns the new commit so the
// caller can tell whether anything changed since the last sync.
export async function fetchSource(source: Source) {
  const dir = path.join(cacheDir(), source.name)
  if (!existsSync(path.join(dir, ".git"))) {
    await fs.mkdir(cacheDir(), { recursive: true })
    await git(["clone", "--depth", "1", source.url, dir])
  } else {
    await git(["-C", dir, "fetch", "--depth", "1", "origin"])
    await git(["-C", dir, "reset", "--hard", "origin/HEAD"])
  }
  const head = await git(["-C", dir, "rev-parse", "HEAD"])
  return { dir, head }
}

// Sync every source, then run the same pipeline on the cached files.
export async function sync(notes?: string) {
  const results = []
  for (const source of SOURCES) {
    const { dir, head } = await fetchSource(source)
    const { index, briefing } = await update(dir, notes)
    results.push({ source: source.name, head, writeups: index.count, briefing })
  }
  return results
}
