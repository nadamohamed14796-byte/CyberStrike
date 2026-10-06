import crypto from "node:crypto"
import fs from "node:fs/promises"
import { TargetWorkspace } from "../tool/target-workspace"
import { ScopeGuard } from "../tool/scope-check"

export type Observation = { kind: "subdomain" | "url" | "endpoint" | "javascript" | "technology" | "response"; value: string; fingerprint?: string }
export type Change = { type: "added" | "removed" | "changed"; kind: Observation["kind"]; value: string; previousFingerprint?: string; fingerprint?: string }
function fingerprint(value: string) { return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16) }
export namespace TargetMonitor {
  async function file(target: string) { const workspace = await TargetWorkspace.ensure(target); return `${workspace.state}/monitor-baseline.json` }
  export async function baseline(target: string, observations: Observation[]) {
    const path = await file(target)
    const unique = new Map<string, Observation>()
    for (const item of observations) unique.set(`${item.kind}:${item.value}`, { ...item, fingerprint: item.fingerprint ?? fingerprint(item.value) })
    await fs.writeFile(path, JSON.stringify([...unique.values()], null, 2), "utf8")
    return [...unique.values()]
  }
  export async function diff(target: string, observations: Observation[], scopeItems: string[] = []) {
    const path = await file(target)
    let previous: Observation[] = []
    try { previous = JSON.parse(await fs.readFile(path, "utf8")) } catch {}
    const current = new Map(observations.map((item) => [`${item.kind}:${item.value}`, { ...item, fingerprint: item.fingerprint ?? fingerprint(item.value) }]))
    const old = new Map(previous.map((item) => [`${item.kind}:${item.value}`, item]))
    const changes: Change[] = []
    for (const [key, item] of current) {
      if (scopeItems.length && !ScopeGuard.check(item.value, scopeItems).inScope) continue
      const prior = old.get(key)
      if (!prior) changes.push({ type: "added", kind: item.kind, value: item.value, fingerprint: item.fingerprint })
      else if (prior.fingerprint !== item.fingerprint) changes.push({ type: "changed", kind: item.kind, value: item.value, previousFingerprint: prior.fingerprint, fingerprint: item.fingerprint })
    }
    for (const [key, item] of old) if (!current.has(key)) changes.push({ type: "removed", kind: item.kind, value: item.value, previousFingerprint: item.fingerprint })
    return changes
  }
}