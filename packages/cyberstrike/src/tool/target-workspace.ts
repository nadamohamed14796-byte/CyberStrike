import crypto from "node:crypto"
import fs from "fs/promises"
import fsSync from "node:fs"
import path from "path"
import { Global } from "../global"
import { normalizeTarget } from "./run-record"
import { ScopeGuard } from "./scope-guard"

export namespace TargetWorkspace {
  export const ROOT = process.env.CYBERSTRIKE_TARGETS_DIR
    ? path.resolve(process.env.CYBERSTRIKE_TARGETS_DIR)
    : path.join(Global.Path.data, "targets")

  const SCOPE_REGISTRY = path.join(ROOT, "scope-registry.json")

  type ScopeRegistry = { schema_version: 1; updated_at: string; scope_items: string[] }

  /** Pick the most specific registered scope that contains a target. */
  export function scopeForTarget(target: string, scopeItems: string[]): string | undefined {
    const matches = scopeItems
      .map((scope) => normalizeTarget(scope))
      .filter(Boolean)
      .filter((scope) => ScopeGuard.check(target, [scope]).inScope)

    const isWildcard = (scope: string) => {
      const withoutScheme =
        scope.startsWith("https://") || scope.startsWith("http://") ? scope.slice(scope.indexOf("://") + 3) : scope
      return withoutScheme.startsWith("*.")
    }
    matches.sort((a, b) => {
      const wildcardDelta = Number(isWildcard(a)) - Number(isWildcard(b))
      return wildcardDelta || b.length - a.length
    })
    return matches[0]
  }

  function readScopeItemsSync(): string[] {
    try {
      const data = JSON.parse(fsSync.readFileSync(SCOPE_REGISTRY, "utf8")) as Partial<ScopeRegistry>
      return Array.isArray(data.scope_items)
        ? data.scope_items.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
        : []
    } catch {
      return []
    }
  }

  function identityFor(target: string): string {
    return scopeForTarget(target, readScopeItemsSync()) ?? normalizeTarget(target)
  }

  async function atomicWriteJSON(file: string, value: unknown): Promise<void> {
    await fs.mkdir(path.dirname(file), { recursive: true })
    const temporary = file + "." + process.pid + "." + crypto.randomUUID() + ".tmp"
    try {
      await fs.writeFile(temporary, JSON.stringify(value, null, 2) + "\n", { encoding: "utf8", flag: "wx" })
      await fs.rename(temporary, file)
    } catch (error) {
      await fs.rm(temporary, { force: true }).catch(() => undefined)
      throw error
    }
  }

  async function ensureTextFile(file: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(file), { recursive: true })
    try {
      const handle = await fs.open(file, "wx")
      try { await handle.writeFile(content, "utf8") } finally { await handle.close() }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
    }
  }

  async function ensureJSONFile(file: string, create: () => Record<string, unknown>): Promise<void> {
    try {
      await fs.access(file)
      return
    } catch {}
    try {
      const handle = await fs.open(file, "wx")
      try {
        await handle.writeFile(JSON.stringify(create(), null, 2) + "\n", "utf8")
      } finally {
        await handle.close()
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
    }
  }

  export type Paths = {
    identity: string
    root: string
    scope: string
    scopeFile: string
    targetFile: string
    targetNotesFile: string
    attackSurfaceFile: string
    assets: string
    endpoints: string
    javascript: string
    relationships: string
    findings: string
    runs: string
    session: string
    recon: string
    artifacts: string
    js: string
    reports: string
    state: string
    lessons: string
    lessonsFile: string
  }

  function slug(target: string) {
    const normalized = normalizeTarget(target)
    if (!normalized) throw new Error("Target workspace requires a non-empty target")
    const hash = crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 12)
    let readable = normalized
      .replace(/^[a-z]+:\/\//i, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 72)
      .replace(/-+$/g, "")
    if (!readable) readable = "target"
    return `${readable}-${hash}`
  }

  function safeSegment(value: string, label: string) {
    if (!value || value === "." || value === ".." || /[\\/]/.test(value)) {
      throw new Error(`Invalid ${label} for target workspace`)
    }
    return value
  }

  export function paths(target: string, sessionID?: string): Paths {
    const identity = identityFor(target)
    const root = path.join(ROOT, slug(identity))
    const scope = path.join(root, "scope")
    const session = path.join(root, "sessions", sessionID ? safeSegment(sessionID, "session id") : "shared")
    return {
      identity,
      root,
      scope,
      scopeFile: path.join(scope, "scope.json"),
      targetFile: path.join(root, "target.json"),
      targetNotesFile: path.join(root, "target-notes.md"),
      attackSurfaceFile: path.join(root, "attack-surface.md"),
      assets: path.join(root, "assets"),
      endpoints: path.join(root, "endpoints"),
      javascript: path.join(root, "javascript"),
      relationships: path.join(root, "relationships"),
      findings: path.join(root, "findings"),
      runs: path.join(root, "runs"),
      session,
      recon: path.join(session, "recon"),
      artifacts: path.join(session, "artifacts"),
      js: path.join(session, "js"),
      reports: path.join(session, "reports"),
      state: path.join(root, "state"),
      lessons: path.join(root, "lessons"),
      lessonsFile: path.join(root, "lessons", "lessons.ndjson"),
    }
  }

  export async function ensure(target: string, sessionID?: string): Promise<Paths> {
    const result = paths(target, sessionID)
    await Promise.all([
      fs.mkdir(result.root, { recursive: true }),
      fs.mkdir(result.scope, { recursive: true }),
      fs.mkdir(result.assets, { recursive: true }),
      fs.mkdir(result.endpoints, { recursive: true }),
      fs.mkdir(result.javascript, { recursive: true }),
      fs.mkdir(result.relationships, { recursive: true }),
      fs.mkdir(result.findings, { recursive: true }),
      fs.mkdir(result.runs, { recursive: true }),
      fs.mkdir(result.session, { recursive: true }),
      fs.mkdir(result.recon, { recursive: true }),
      fs.mkdir(result.artifacts, { recursive: true }),
      fs.mkdir(result.js, { recursive: true }),
      fs.mkdir(result.reports, { recursive: true }),
      fs.mkdir(result.state, { recursive: true }),
      fs.mkdir(result.lessons, { recursive: true }),
    ])
    const now = new Date().toISOString()
    await Promise.all([
      ensureJSONFile(result.scopeFile, () => ({
        schema_version: 1,
        scope: result.identity,
        normalized_scope: normalizeTarget(result.identity),
        created_at: now,
        updated_at: now,
      })),
      ensureJSONFile(result.targetFile, () => ({
        schema_version: 1,
        identity: result.identity,
        workspace_id: slug(result.identity),
        created_at: now,
        updated_at: now,
      })),
    ])
    await Promise.all([
      ensureTextFile(result.targetNotesFile, "# Target Notes\n\n- Target: " + result.identity + "\n- Workspace ID: " + slug(result.identity) + "\n\n## System overview\n- Pending verified observations.\n\n## Applications and trust boundaries\n- Pending discovery.\n\n## Host, endpoint, and JavaScript relationships\n- Pending correlation.\n\n## Confirmed observations and negative results\n- Pending recon.\n\n## Next hypotheses\n- Pending evidence.\n"),
      ensureTextFile(result.attackSurfaceFile, "# Attack Surface\n\n- Target: " + result.identity + "\n- Workspace ID: " + slug(result.identity) + "\n\n## Scope and authorization\n- Scope status: UNVERIFIED until matched against authoritative program scope.\n- Active testing: not authorized merely by entering a target.\n\n## Inventory\n### Domains and subdomains\n- Pending.\n### Live hosts and services\n- Pending.\n### URLs, API routes, and parameters\n- Pending.\n### JavaScript assets and client-side routes\n- Pending.\n### Identity and trust boundaries\n- Pending.\n\n## Evidence and provenance\n- Record source, timestamp, artifact path, scope decision, and confidence.\n- Deduplicate canonical assets but preserve separate observations.\n\n## Risk-ranked follow-up\n- Pending evidence.\n\n## Out-of-scope or blocked actions\n- Record excluded assets and missing authorization.\n"),
    ])
    await ensureLessonsFile(result.lessonsFile)
    return result
  }

  /**
   * Register the explicitly entered scope set and create its workspaces immediately.
   * Older workspace directories remain on disk; the registry only controls routing
   * for the currently entered set.
   */
  export async function ensureScopes(scopeItems: string[], sessionID?: string): Promise<Paths[]> {
    const normalized = Array.from(
      new Set(scopeItems.map((item) => normalizeTarget(item)).filter((item) => Boolean(item))),
    )
    if (!normalized.length) return []

    await fs.mkdir(ROOT, { recursive: true })
    const registry: ScopeRegistry = {
      schema_version: 1,
      updated_at: new Date().toISOString(),
      scope_items: normalized,
    }
    await atomicWriteJSON(SCOPE_REGISTRY, registry)
    return Promise.all(normalized.map((scope) => ensure(scope, sessionID)))
  }

  export type LessonKind = "observation" | "mistake" | "pattern" | "finding" | "technique" | "note"

  export type Lesson = {
    id: string
    createdAt: string
    kind: LessonKind
    summary: string
    details?: string
    source?: string
    confidence?: "low" | "medium" | "high"
    sessionID?: string
    tags?: string[]
  }

  const MAX_LESSON_FILE_BYTES = 8 * 1024 * 1024
  const MAX_RECENT_LESSON_BYTES = 512 * 1024
  const lessonLocks = new Map<string, Promise<void>>()

  function lessonKey(lesson: Pick<Lesson, "kind" | "summary" | "tags">) {
    return [
      lesson.kind,
      lesson.summary.trim().toLowerCase().replace(/\s+/g, " "),
      ...(lesson.tags ?? []).map((tag) => tag.trim().toLowerCase()).sort(),
    ].join("|")
  }

  async function ensureLessonsFile(file: string) {
    // Append mode creates the file without truncating another concurrent writer's data.
    const handle = await fs.open(file, "a")
    await handle.close()
  }

  export function targetFrom(value?: string): string | undefined {
    const raw = value?.trim()
    if (!raw) return undefined
    const urlMatch = raw.match(/https?:\/\/[^\s"'<>]+/i)
    const candidate = urlMatch?.[0] ?? (/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`)
    try {
      const url = new URL(candidate)
      if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
      return url.origin
    } catch {
      return undefined
    }
  }

  function cleanLessonText(value: string | undefined, maxLength: number) {
    return value?.replace(/\s+/g, " ").trim().slice(0, maxLength)
  }

  function normalizeLesson(input: Omit<Lesson, "id" | "createdAt">) {
    return {
      ...input,
      summary: cleanLessonText(input.summary, 500) ?? "",
      details: cleanLessonText(input.details, 4000),
      source: cleanLessonText(input.source, 300),
      tags: input.tags
        ?.map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 20),
    }
  }

  async function withLessonLock<T>(target: string, fn: () => Promise<T>): Promise<T> {
    const key = path.resolve(paths(target).lessonsFile)
    const previous = lessonLocks.get(key)
    let release!: () => void
    const current = new Promise<void>((resolve) => {
      release = resolve
    })
    lessonLocks.set(key, current)
    if (previous) await previous
    try {
      return await fn()
    } finally {
      release()
      if (lessonLocks.get(key) === current) lessonLocks.delete(key)
    }
  }

  /** Persist a compact target-specific lesson once. Equivalent observations are deduplicated. */
  export async function addLesson(target: string, lesson: Omit<Lesson, "id" | "createdAt">): Promise<Lesson> {
    return withLessonLock(target, async () => {
      const paths = await ensure(target, lesson.sessionID)
      const normalized = normalizeLesson(lesson)
      if (!normalized.summary) throw new Error("Target lesson requires a non-empty summary")

      const existing = await readLessons(target)
      const duplicate = existing.find((item) => lessonKey(item) === lessonKey(normalized))
      if (duplicate) return duplicate

      const record: Lesson = {
        ...normalized,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }
      await fs.appendFile(paths.lessonsFile, JSON.stringify(record) + "\n", "utf8")
      return record
    })
  }

  export async function readLessons(target: string): Promise<Lesson[]> {
    const paths = await ensure(target)
    const stat = await fs.stat(paths.lessonsFile)
    if (stat.size > MAX_LESSON_FILE_BYTES) {
      throw new Error(`Target lesson history exceeds the ${MAX_LESSON_FILE_BYTES}-byte safety limit`)
    }
    const content = await fs.readFile(paths.lessonsFile, "utf8")
    const lessons: Lesson[] = []
    for (const [index, line] of content.split("\n").entries()) {
      if (!line.trim()) continue
      try {
        lessons.push(JSON.parse(line) as Lesson)
      } catch {
        throw new Error(`Invalid lesson record at line ${index + 1} for target workspace`)
      }
    }
    return lessons
  }

  /** Return the newest bounded lessons without rereading an unbounded target history. */
  export async function recentLessons(target: string, limit = 12): Promise<Lesson[]> {
    const wanted = Math.max(0, Math.min(100, Math.floor(limit)))
    if (!wanted) return []
    const paths = await ensure(target)
    const handle = await fs.open(paths.lessonsFile, "r")
    try {
      const stat = await handle.stat()
      if (stat.size <= MAX_RECENT_LESSON_BYTES) {
        const lessons = await readLessons(target)
        return lessons.slice(-wanted)
      }
      const start = Math.max(0, stat.size - MAX_RECENT_LESSON_BYTES)
      const buffer = Buffer.alloc(stat.size - start)
      await handle.read(buffer, 0, buffer.length, start)
      const lines = buffer.toString("utf8").split("\n")
      if (start > 0) lines.shift()
      const newest: Lesson[] = []
      for (let i = lines.length - 1; i >= 0 && newest.length < wanted; i--) {
        const line = lines[i]?.trim()
        if (!line) continue
        try {
          newest.push(JSON.parse(line) as Lesson)
        } catch {
          // The leading tail fragment may be partial; full-history callers still get strict parsing.
          continue
        }
      }
      return newest.reverse()
    } finally {
      await handle.close()
    }
  }

  export function contains(target: string, candidate: string, sessionID?: string) {
    const base = path.resolve(paths(target, sessionID).session)
    const resolvedBase = fsSync.existsSync(base) ? fsSync.realpathSync.native(base) : base
    const resolvedCandidatePath = path.resolve(candidate)
    const resolvedCandidate = fsSync.existsSync(resolvedCandidatePath)
      ? fsSync.realpathSync.native(resolvedCandidatePath)
      : resolvedCandidatePath
    return resolvedCandidate === resolvedBase || resolvedCandidate.startsWith(resolvedBase + path.sep)
  }
}
