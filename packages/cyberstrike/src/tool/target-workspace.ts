import crypto from "node:crypto"
import fs from "fs/promises"
import path from "path"
import { Global } from "../global"
import { normalizeTarget } from "./run-record"

export namespace TargetWorkspace {
  export const ROOT = process.env.CYBERSTRIKE_TARGETS_DIR
    ? path.resolve(process.env.CYBERSTRIKE_TARGETS_DIR)
    : path.join(Global.Path.data, "targets")

  export type Paths = {
    root: string
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
    const root = path.join(ROOT, slug(target))
    const session = path.join(root, "sessions", sessionID ? safeSegment(sessionID, "session id") : "shared")
    return {
      root,
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
      fs.mkdir(result.session, { recursive: true }),
      fs.mkdir(result.recon, { recursive: true }),
      fs.mkdir(result.artifacts, { recursive: true }),
      fs.mkdir(result.js, { recursive: true }),
      fs.mkdir(result.reports, { recursive: true }),
      fs.mkdir(result.state, { recursive: true }),
      fs.mkdir(result.lessons, { recursive: true }),
      ensureLessonsFile(result.lessonsFile),
    ])
    return result
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

  async function ensureLessonsFile(file: string) {
    try {
      await fs.access(file)
    } catch {
      await fs.writeFile(file, "", "utf8")
    }
  }

  function lessonKey(lesson: Pick<Lesson, "kind" | "summary" | "tags">) {
    return [
      lesson.kind,
      lesson.summary.trim().toLowerCase().replace(/\s+/g, " "),
      ...(lesson.tags ?? []).map((tag) => tag.trim().toLowerCase()).sort(),
    ].join("|")
  }

  /** Persist a target-scoped lesson once. Repeated observations are merged by key at write time. */
  export async function addLesson(target: string, lesson: Omit<Lesson, "id" | "createdAt">): Promise<Lesson> {
    const paths = await ensure(target, lesson.sessionID)
    const normalized = {
      ...lesson,
      summary: lesson.summary.trim().slice(0, 500),
      details: lesson.details?.trim().slice(0, 4000),
      source: lesson.source?.trim().slice(0, 300),
      tags: lesson.tags?.map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 20),
    }
    const existing = await readLessons(target)
    const key = lessonKey(normalized)
    const duplicate = existing.find((item) => lessonKey(item) === key)
    if (duplicate) return duplicate

    const record: Lesson = {
      ...normalized,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    await fs.appendFile(paths.lessonsFile, JSON.stringify(record) + "\n", "utf8")
    return record
  }

  /** Return the newest bounded lessons for prompt/context injection. */
  export async function recentLessons(target: string, limit = 12): Promise<Lesson[]> {
    const lessons = await readLessons(target)
    return lessons.slice(-Math.max(0, limit))
  }

  export async function readLessons(target: string): Promise<Lesson[]> {
    const paths = await ensure(target)
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

  export function contains(target: string, candidate: string, sessionID?: string) {
    const base = paths(target, sessionID).session
    const resolvedBase = path.resolve(base)
    const resolvedCandidate = path.resolve(candidate)
    return resolvedCandidate === resolvedBase || resolvedCandidate.startsWith(resolvedBase + path.sep)
  }
}
