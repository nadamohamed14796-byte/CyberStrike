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
    ])
    return result
  }

  export function contains(target: string, candidate: string, sessionID?: string) {
    const base = paths(target, sessionID).session
    const resolvedBase = path.resolve(base)
    const resolvedCandidate = path.resolve(candidate)
    return resolvedCandidate === resolvedBase || resolvedCandidate.startsWith(resolvedBase + path.sep)
  }
}
