import path from "node:path"
import { mkdir } from "node:fs/promises"

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
  await Bun.write(file, JSON.stringify(value, null, 2) + "\n")
}
export async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true })
}
export async function appendEvent(root: string, target: string, event: Record<string, unknown>) {
  const file = path.join(targetDir(root, target), "events.jsonl")
  await ensureDir(path.dirname(file))
  const current = await Bun.file(file).exists() ? await Bun.file(file).text() : ""
  await Bun.write(file, current + JSON.stringify(event) + "\n")
}