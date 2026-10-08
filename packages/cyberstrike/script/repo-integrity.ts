#!/usr/bin/env bun

import { $ } from "bun"
import fs from "node:fs/promises"
import path from "node:path"
import { Database as BunDatabase } from "bun:sqlite"
import { getTableConfig, is, SQLiteTable } from "drizzle-orm/sqlite-core"
import * as schema from "../src/storage/schema"

type Problem = { category: string; path?: string; message: string }
const problems: Problem[] = []
const root = path.resolve(import.meta.dir, "../../..")
const pkgRoot = path.join(root, "packages", "cyberstrike")

function fail(category: string, message: string, file?: string) {
  problems.push({ category, path: file, message })
}
async function exists(file: string) {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}
async function glob(rootDir: string, pattern: string) {
  return Array.fromAsync(new Bun.Glob(pattern).scan({ cwd: rootDir, absolute: true, onlyFiles: true, dot: true }))
}

async function checkPackages() {
  const packageFiles = await glob(root, "**/package.json")
  const packages = new Map<string, string>()
  const parsed: Array<{ file: string; pkg: any }> = []

  for (const file of packageFiles) {
    try {
      const pkg = JSON.parse(await Bun.file(file).text())
      parsed.push({ file, pkg })
      if (typeof pkg.name === "string") {
        if (packages.has(pkg.name)) fail("package-layout", "duplicate package name: " + pkg.name, file)
        packages.set(pkg.name, path.dirname(file))
      }
    } catch (error) {
      fail("package-json", "invalid JSON: " + String(error), file)
    }
  }

  for (const { file, pkg } of parsed) {
    const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {}, pkg.optionalDependencies || {}, pkg.peerDependencies || {})
    for (const [name, version] of Object.entries(deps)) {
      if (version === "workspace:*" && !packages.has(name)) {
        fail("package-dependency", "workspace dependency does not resolve: " + name, file)
      }
    }

    if (pkg.bin && typeof pkg.bin === "object") {
      for (const target of Object.values(pkg.bin)) {
        if (typeof target !== "string" || target.includes("*")) continue
        if (!(await exists(path.resolve(path.dirname(file), target)))) {
          fail("package-bin", "missing bin target: " + target, file)
        }
      }
    }

    const exportsValue = pkg.exports
    if (exportsValue && typeof exportsValue === "object") {
      const targets: string[] = []
      const collect = (value: unknown) => {
        if (typeof value === "string") targets.push(value)
        else if (value && typeof value === "object")
          for (const nested of Object.values(value as Record<string, unknown>)) collect(nested)
      }
      collect(exportsValue)
      for (const target of targets) {
        if (target.includes("*") || target.startsWith("http")) continue
        if (!(await exists(path.resolve(path.dirname(file), target)))) {
          fail("package-export", "missing export target: " + target, file)
        }
      }
    }
  }
}

async function checkRelativeImports() {
  const sourceFiles = await glob(root, "**/*.{ts,tsx,js,jsx,mjs,cjs}")
  const importRe = /(?:from\s*[('\"`]|import\s*\(\s*[('\"`]|require\s*\(\s*[('\"`])([^'\"`]+)['\"`]/g

  function candidatesFor(spec: string, file: string) {
    const base = spec.startsWith("@/") ? path.join(pkgRoot, "src", spec.slice(2)) : path.resolve(path.dirname(file), spec)
    const out = [base]
    if (!path.extname(base)) {
      for (const ext of [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"]) out.push(base + ext)
      for (const ext of [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]) out.push(path.join(base, "index" + ext))
    }
    return out
  }

  for (const file of sourceFiles) {
    if (file.includes("/node_modules/") || file.includes("/.git/")) continue
    const source = await Bun.file(file).text()
    for (const match of source.matchAll(importRe)) {
      const spec = match[1]
      if (!(spec.startsWith(".") || spec.startsWith("@/"))) continue
      if (/\.(css|scss|sass|less|svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf)$/i.test(spec)) continue
      if (!(await Promise.any(candidatesFor(spec, file).map(exists)).catch(() => false)))
        fail("import-resolution", "unresolved import: " + spec, path.relative(root, file))
    }
  }
}

async function checkLocalWorkflowActions() {
  const workflows = await glob(root, ".github/workflows/*.{yml,yaml}")
  for (const file of workflows) {
    const source = await Bun.file(file).text()
    for (const match of source.matchAll(/uses:\s*\.\/\.github\/actions\/([^@\s]+)/g)) {
      const dir = path.join(root, ".github", "actions", match[1])
      if (!(await exists(dir))) {
        fail("workflow-action", "missing local action directory: " + match[1], path.relative(root, file))
        continue
      }
      if (!(await exists(path.join(dir, "action.yml"))) && !(await exists(path.join(dir, "action.yaml"))))
        fail("workflow-action", "local action has no action.yml/action.yaml: " + match[1], path.relative(root, file))
    }
  }
}

async function checkTsconfigs() {
  const files = await glob(root, "**/tsconfig*.json")
  for (const file of files) {
    try {
      const cfg = JSON.parse(await Bun.file(file).text())
      if (typeof cfg.extends !== "string" || !cfg.extends.startsWith(".")) continue
      const base = path.resolve(path.dirname(file), cfg.extends)
      const candidates = [base, base + ".json", path.join(base, "tsconfig.json")]
      const ok = await Promise.any(candidates.map(exists)).catch(() => false)
      if (!ok) fail("tsconfig", "missing extends target: " + cfg.extends, file)
    } catch (error) {
      fail("tsconfig", "invalid JSON: " + String(error), file)
    }
  }
}

async function checkScripts() {
  const ts = await Promise.all([
    glob(root, "script/**/*.{ts,tsx,js,mjs,cjs}"),
    glob(root, "packages/**/script/**/*.{ts,tsx,js,mjs,cjs}"),
    glob(root, "packages/**/scripts/**/*.{ts,tsx,js,mjs,cjs}"),
  ]).then((x) => [...new Set(x.flat())])
  for (const file of ts) {
    try {
      const ext = path.extname(file)
      const loader = ext === ".tsx" ? "tsx" : ext === ".ts" ? "ts" : "js"
      new Bun.Transpiler({ loader }).transformSync(await Bun.file(file).text())
    } catch (error) {
      fail("script-syntax", "Bun parser rejected script: " + String(error), path.relative(root, file))
    }
  }

  const sh = await Promise.all([
    glob(root, "script/**/*.{sh,bash}"),
    glob(root, "packages/**/script/**/*.{sh,bash}"),
    glob(root, "packages/**/scripts/**/*.{sh,bash}"),
  ]).then((x) => [...new Set(x.flat())])
  for (const file of sh) {
    const r = Bun.spawnSync(["bash", "-n", file], { stdout: "ignore", stderr: "pipe" })
    if (r.exitCode !== 0) {
      fail("shell-syntax", new TextDecoder().decode(r.stderr).trim() || "bash -n failed", path.relative(root, file))
    }
  }

  const py = await Promise.all([
    glob(root, ".cyberstrike/**/*.py"),
    glob(root, "packages/**/*.py"),
    glob(root, "script/**/*.py"),
  ]).then((x) => [...new Set(x.flat())])
  for (const file of py) {
    const r = Bun.spawnSync(["python3", "-m", "py_compile", file], { stdout: "ignore", stderr: "pipe" })
    if (r.exitCode !== 0) {
      fail("python-syntax", new TextDecoder().decode(r.stderr).trim() || "py_compile failed", path.relative(root, file))
    }
  }
}

async function checkSchemaExports() {
  const schemaText = await Bun.file(path.join(pkgRoot, "src/storage/schema.ts")).text()
  const files = await glob(path.join(pkgRoot, "src"), "**/*.sql.ts")
  for (const file of files) {
    if (file.endsWith("/storage/schema.sql.ts")) continue
    const source = await Bun.file(file).text()
    const names = [...source.matchAll(/export const ([A-Za-z0-9_]+) = sqliteTable\(/g)].map((m) => m[1])
    for (const name of names) {
      if (!new RegExp("\\b" + name + "\\b").test(schemaText)) {
        fail("schema-export", "table is not exported through storage/schema.ts: " + name, path.relative(root, file))
      }
    }
  }
}

function splitMigration(sql: string) {
  return sql
    .split(/-->\s*statement-breakpoint/gi)
    .map((x) => x.trim())
    .filter(Boolean)
}

async function checkDatabase() {
  const migrations = (await glob(path.join(pkgRoot, "migration"), "*/migration.sql")).sort((a, b) =>
    path.basename(path.dirname(a)).localeCompare(path.basename(path.dirname(b))),
  )

  const sqlite = new BunDatabase(":memory:")
  sqlite.run("PRAGMA foreign_keys = ON")
  try {
    let lastTimestamp = 0
    const names = new Set<string>()

    for (const file of migrations) {
      const name = path.basename(path.dirname(file))
      const match = /^([0-9]{14})_/.exec(name)
      if (!match) {
        fail("migration-order", "migration directory has no 14-digit timestamp: " + name, path.relative(root, file))
      } else {
        const ts = Number(match[1])
        if (ts <= lastTimestamp)
          fail("migration-order", "migration timestamp is not strictly increasing: " + name, path.relative(root, file))
        lastTimestamp = ts
      }
      if (names.has(name)) fail("migration-order", "duplicate migration directory: " + name, path.relative(root, file))
      names.add(name)

      for (const statement of splitMigration(await Bun.file(file).text())) {
        try {
          sqlite.run(statement)
        } catch (error) {
          fail("migration-apply", String(error), path.relative(root, file))
          break
        }
      }
    }

    const expected = new Map<string, any>()
    for (const value of Object.values(schema)) {
      if (!is(value, SQLiteTable)) continue
      const cfg = getTableConfig(value)
      if (expected.has(cfg.name)) fail("schema", "duplicate Drizzle table: " + cfg.name)
      expected.set(cfg.name, cfg)
    }

    const actualTables = (
      sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {
        name: string
      }[]
    ).map((x) => x.name)

    for (const table of expected.keys()) {
      if (!actualTables.includes(table)) fail("schema-table", "table missing after migrations: " + table)
    }
    for (const table of actualTables) {
      if (!expected.has(table))
        fail("schema-table", "migration-created table missing from current Drizzle schema: " + table)
    }

    for (const [table, cfg] of expected) {
      const actualColumns = new Set(
        (sqlite.prepare('PRAGMA table_info("' + table + '")').all() as { name: string }[]).map((x) => x.name),
      )
      for (const col of cfg.columns) {
        if (!actualColumns.has(col.name))
          fail("schema-column", "column missing after migrations: " + table + "." + col.name)
      }
      const expectedColumns = new Set(cfg.columns.map((col: any) => col.name))
      for (const col of actualColumns) {
        if (!expectedColumns.has(col))
          fail("schema-column", "migration-created column is absent from current Drizzle schema: " + table + "." + col)
      }
      const actualIndexes = new Set(
        (sqlite.prepare('PRAGMA index_list("' + table + '")').all() as { name: string }[]).map((x) => x.name),
      )
      for (const idx of (cfg as any).indexes || []) {
        const name = idx?.config?.name
        if (typeof name === "string" && !actualIndexes.has(name))
          fail("schema-index", "index missing after migrations: " + name)
      }
    }

    const fkRows = sqlite
      .prepare(
        "SELECT m.name AS table_name, fk.table AS target_table FROM sqlite_master m JOIN pragma_foreign_key_list(m.name) fk WHERE m.type='table' AND m.name NOT LIKE 'sqlite_%'",
      )
      .all() as { table_name: string; target_table: string }[]
    for (const row of fkRows) {
      if (!expected.has(row.target_table))
        fail("schema-fk", "foreign key points to unknown table: " + row.table_name + " -> " + row.target_table)
    }

    const integrity = sqlite.query("PRAGMA integrity_check").get() as { integrity_check: string }
    if (integrity.integrity_check !== "ok") fail("db-integrity", "integrity_check: " + integrity.integrity_check)
    const foreign = sqlite.query("PRAGMA foreign_key_check").all()
    if (foreign.length) fail("db-integrity", "foreign_key_check returned " + foreign.length + " violation(s)")
  } finally {
    sqlite.close()
  }
}

async function main() {
  await checkPackages()
  await checkRelativeImports()
  await checkLocalWorkflowActions()
  await checkTsconfigs()
  await checkSchemaExports()
  await checkScripts()
  await checkDatabase()

  if (problems.length) {
    for (const p of problems) {
      console.error("[" + p.category + "] " + (p.path ? p.path + ": " : "") + p.message)
    }
    console.error("")
    console.error("Repository integrity audit failed with " + problems.length + " issue(s).")
    process.exit(1)
  }

  console.log("Repository integrity audit passed.")
}

await main()
