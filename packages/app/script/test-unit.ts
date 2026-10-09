#!/usr/bin/env bun

import { readdir } from "node:fs/promises"
import path from "node:path"
import { spawnSync } from "node:child_process"

const packageRoot = path.resolve(import.meta.dir, "..")
const sourceRoot = path.join(packageRoot, "src")
const testName = /(?:\.test\.|\.spec\.|_test_|_spec_|_test\.|_spec\.)[cm]?[jt]sx?$/i

async function findTests(directory: string): Promise<string[]> {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return findTests(fullPath)
      if (entry.isFile() && testName.test(entry.name)) return [fullPath]
      return []
    }),
  )
  return files.flat()
}

const testFiles = (await findTests(sourceRoot)).sort()
if (testFiles.length === 0) {
  console.log("No unit-test files found under packages/app/src; skipping the empty app unit-test suite.")
  process.exit(0)
}

const args = [
  "test",
  "--preload",
  "./happydom.ts",
  ...testFiles.map((file) => path.relative(packageRoot, file)),
]
const result = spawnSync(process.execPath, args, { cwd: packageRoot, stdio: "inherit" })
if (result.error) {
  console.error("Could not start Bun unit tests:", result.error.message)
  process.exit(1)
}
process.exit(result.status ?? 1)
