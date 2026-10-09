import path from "node:path"
import { mkdir } from "node:fs/promises"
import { redactSecrets } from "./policy"

export function slug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "target"
}
export function targetDir(root: string, target: string) {
  return path.join(root, "targets", slug(target))
}
export async function readJson<T>(file: string, fallback: T): Promise<T> {
  const f = Bun.file(file)
  if (!(await f.exists())) return fallback
  try { return await f.json() } catch { return fallback }
}
export async function writeJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true })
  await Bun.write(file, JSON.stringify(redactSecrets(value), null, 2) + "\n")
}
export async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true })
}

const targetMutationQueues = new Map<string, Promise<void>>()

export async function withTargetMutationLock<T>(
  root: string,
  target: string,
  work: () => Promise<T>,
): Promise<T> {
  const key = targetDir(root, target)
  const previous = targetMutationQueues.get(key) ?? Promise.resolve()
  let release!: () => void
  const current = new Promise<void>(resolve => { release = resolve })
  targetMutationQueues.set(key, current)
  await previous
  try {
    return await work()
  } finally {
    release()
    if (targetMutationQueues.get(key) === current) targetMutationQueues.delete(key)
  }
}

export async function appendEvent(root: string, target: string, event: Record<string, unknown>) {
  return withTargetMutationLock(root, target, async () => {
    const file = path.join(targetDir(root, target), "events.jsonl")
    await ensureDir(path.dirname(file))
    const current = await Bun.file(file).exists() ? await Bun.file(file).text() : ""
    await Bun.write(file, current + JSON.stringify(redactSecrets(event)) + "\n")
  })
}