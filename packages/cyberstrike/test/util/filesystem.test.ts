import { describe, expect, test } from "bun:test"
import os from "node:os"
import path from "node:path"
import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises"
import { Filesystem } from "../../src/util/filesystem"

describe("util.filesystem", () => {
  test("exists() is true for files and directories", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "cyberstrike-filesystem-"))
    const dir = path.join(tmp, "dir")
    const file = path.join(tmp, "file.txt")
    const missing = path.join(tmp, "missing")

    await mkdir(dir, { recursive: true })
    await Bun.write(file, "hello")

    const cases = await Promise.all([Filesystem.exists(dir), Filesystem.exists(file), Filesystem.exists(missing)])

    expect(cases).toEqual([true, true, false])

    await rm(tmp, { recursive: true, force: true })
  })

  test("containsReal() rejects symlink escapes", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "cyberstrike-filesystem-"))
    const project = path.join(tmp, "project")
    const outside = path.join(tmp, "outside")
    const link = path.join(project, "link")
    const secret = path.join(outside, "secret.txt")

    await mkdir(project, { recursive: true })
    await mkdir(outside, { recursive: true })
    await Bun.write(secret, "secret")
    await symlink(outside, link)

    expect(Filesystem.contains(project, path.join(link, "secret.txt"))).toBe(true)
    expect(await Filesystem.containsReal(project, path.join(link, "secret.txt"))).toBe(false)

    await rm(tmp, { recursive: true, force: true })
  })

  test("isDir() is true only for directories", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "cyberstrike-filesystem-"))
    const dir = path.join(tmp, "dir")
    const file = path.join(tmp, "file.txt")
    const missing = path.join(tmp, "missing")

    await mkdir(dir, { recursive: true })
    await Bun.write(file, "hello")

    const cases = await Promise.all([Filesystem.isDir(dir), Filesystem.isDir(file), Filesystem.isDir(missing)])

    expect(cases).toEqual([true, false, false])

    await rm(tmp, { recursive: true, force: true })
  })
})
