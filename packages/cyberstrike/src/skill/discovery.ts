import path from "path"
import { mkdir } from "fs/promises"
import { Log } from "../util/log"
import { Global } from "../global"

export namespace Discovery {
  const log = Log.create({ service: "skill-discovery" })

  type IndexSkill = {
    name: string
    description: string
    path?: string
  } & ({ files: string[] } | { type: "skill-md" | "archive"; url: string; digest?: string })

  function safeRelative(value: string): string | undefined {
    const normalizedInput = value.replaceAll("\\", "/")
    if (normalizedInput.startsWith("/") || /^[A-Za-z]:\//.test(normalizedInput)) return undefined
    const normalized = path.posix.normalize(normalizedInput)
    if (normalized === ".." || normalized.startsWith("../")) return undefined
    return normalized === "." ? "" : normalized
  }

  function resolveUnder(root: string, relative: string): string | undefined {
    const base = path.resolve(root)
    const candidate = path.resolve(base, relative)
    if (candidate !== base && !candidate.startsWith(base + path.sep)) return undefined
    return candidate
  }

  type Index = {
    skills: IndexSkill[]
  }

  export function dir() {
    return path.join(Global.Path.cache, "skills")
  }

  async function get(url: string, dest: string): Promise<boolean> {
    if (await Bun.file(dest).exists()) return true
    return fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          log.error("failed to download", { url, status: response.status })
          return false
        }
        await Bun.write(dest, await response.text())
        return true
      })
      .catch((err) => {
        log.error("failed to download", { url, err })
        return false
      })
  }

  export async function pull(url: string): Promise<string[]> {
    const result: string[] = []
    const base = url.endsWith("/") ? url : `${url}/`
    const index = new URL("index.json", base).href
    const cache = dir()
    const host = base.slice(0, -1)

    log.info("fetching index", { url: index })
    const data = await fetch(index)
      .then(async (response) => {
        if (!response.ok) {
          log.error("failed to fetch index", { url: index, status: response.status })
          return undefined
        }
        return response
          .json()
          .then((json) => json as Index)
          .catch((err) => {
            log.error("failed to parse index", { url: index, err })
            return undefined
          })
      })
      .catch((err) => {
        log.error("failed to fetch index", { url: index, err })
        return undefined
      })

    if (!data?.skills || !Array.isArray(data.skills)) {
      log.warn("invalid index format", { url: index })
      return result
    }

    const list = data.skills.filter((skill) => {
      if (!skill?.name) {
        log.warn("invalid skill entry", { url: index, skill })
        return false
      }
      const hasFiles = "files" in skill && Array.isArray(skill.files)
      const hasUrl = "url" in skill && typeof skill.url === "string"
      if (!hasFiles && !hasUrl) {
        log.warn("invalid skill entry", { url: index, skill })
        return false
      }
      return true
    })

    await Promise.all(
      list.map(async (skill) => {
        const skillRelative = safeRelative(skill.path ?? skill.name)
        if (skillRelative === undefined || !skill.name.trim()) {
          log.warn("invalid skill path", { name: skill.name, path: skill.path })
          return
        }

        const root = resolveUnder(cache, skillRelative)
        if (!root) {
          log.warn("unsafe skill path", { name: skill.name, path: skill.path })
          return
        }

        if ("files" in skill && Array.isArray(skill.files)) {
          // Legacy format: array of individual files
          await Promise.all(
            skill.files.map(async (file) => {
              const safeFile = safeRelative(file)
              if (safeFile === undefined || !safeFile) {
                log.warn("unsafe skill file path", { name: skill.name, file })
                return
              }
              const basePath = skillRelative ? skillRelative + "/" : ""
              const link = new URL(safeFile, host + "/" + basePath).href
              const dest = resolveUnder(root, safeFile)
              if (!dest) {
                log.warn("unsafe skill destination", { name: skill.name, file })
                return
              }
              await mkdir(path.dirname(dest), { recursive: true })
              await get(link, dest)
            }),
          )
        } else if ("url" in skill && typeof skill.url === "string") {
          const link = new URL(skill.url, base).href
          if ("type" in skill && skill.type === "archive") {
            // Archive format: download tar.gz and extract
            const archive = path.join(root, `${path.basename(skill.name)}.tar.gz`)
            await mkdir(root, { recursive: true })
            if (await get(link, archive)) {
              await Bun.$`tar xzf ${archive} -C ${root} 2>/dev/null`.quiet().nothrow()
            }
          } else {
            // Single file (skill-md): download as SKILL.md
            const dest = path.join(root, "SKILL.md")
            await mkdir(root, { recursive: true })
            await get(link, dest)
          }
        }

        const md = path.join(root, "SKILL.md")
        if (await Bun.file(md).exists()) result.push(root)
      }),
    )

    return result
  }
}
