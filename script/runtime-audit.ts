#!/usr/bin/env bun

import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

const ROOT = path.resolve(import.meta.dir, "..")
const AUDIT_DIR = path.join(ROOT, ".git", "cyberstrike-audit")
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs", ".cts", ".cjs"])
const TEXT_EXTENSIONS = new Set([".md", ".mdx"])
const RESOLVE_EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs", ".cts", ".cjs", ".json", ".css", ".svg", ".png"]
const CONFIG_FILES = new Set(["package.json", "tsconfig.json"])

type FileEntry = {
  id: string
  path: string
}

type Relation = {
  id: string
  kind: "import" | "export" | "dynamic-import" | "require" | "package-dependency" | "tsconfig-reference" | "markdown-link"
  sourceID: string
  sourcePath: string
  targetID?: string
  targetPath?: string
  specifier: string
}

type BrokenRelation = Relation & {
  reason: string
}

function git(args: string[]) {
  const proc = Bun.spawnSync(["git", ...args], { cwd: ROOT })
  const stdout = new TextDecoder().decode(proc.stdout)
  const stderr = new TextDecoder().decode(proc.stderr)
  if (proc.exitCode !== 0) throw new Error(`git ${args.join(" ")} failed: ${stderr.trim()}`)
  return stdout
}

function normalizeRepoPath(value: string) {
  return value.split(path.sep).join("/").replace(/^\.\//, "")
}

function resolveExisting(repoRelative: string) {
  const clean = normalizeRepoPath(path.posix.normalize(repoRelative))
  if (clean.startsWith("../") || clean === "..") return
  for (const suffix of RESOLVE_EXTENSIONS) {
    const candidate = suffix ? clean + suffix : clean
    const absolute = path.join(ROOT, candidate)
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return candidate
  }
  const dir = path.join(ROOT, clean)
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    for (const suffix of RESOLVE_EXTENSIONS.slice(1, -4)) {
      const candidate = path.posix.join(clean, "index" + suffix)
      const absolute = path.join(ROOT, candidate)
      if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return candidate
    }
    const pkg = path.join(dir, "package.json")
    if (fs.existsSync(pkg)) {
      try {
        const data = JSON.parse(fs.readFileSync(pkg, "utf8")) as { main?: string; module?: string }
        for (const entry of [data.module, data.main]) {
          if (!entry) continue
          const resolved = resolveExisting(path.posix.join(clean, entry))
          if (resolved) return resolved
        }
      } catch {}
    }
  }
  return
}

function tsKind(filePath: string) {
  const ext = path.extname(filePath)
  if (ext === ".tsx") return ts.ScriptKind.TSX
  if (ext === ".jsx") return ts.ScriptKind.JSX
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") return ts.ScriptKind.JS
  return ts.ScriptKind.TS
}

function relativeSpecifier(sourcePath: string, specifier: string) {
  return normalizeRepoPath(
    path.posix.join(path.posix.dirname(sourcePath), specifier),
  )
}

function readJson(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, filePath), "utf8")) as Record<string, unknown>
  } catch {
    return
  }
}

function collectAliases(tsconfigPath: string) {
  const config = readJson(tsconfigPath)
  const compilerOptions = (config?.compilerOptions as Record<string, unknown> | undefined) ?? {}
  const paths = (compilerOptions.paths as Record<string, unknown> | undefined) ?? {}
  const baseUrl = typeof compilerOptions.baseUrl === "string" ? compilerOptions.baseUrl : "."
  return Object.entries(paths)
    .flatMap(([pattern, values]) => {
      if (!Array.isArray(values)) return []
      return values
        .filter((value): value is string => typeof value === "string")
        .map((target) => ({
          pattern,
          target,
          base: normalizeRepoPath(path.posix.join(path.posix.dirname(tsconfigPath), baseUrl)),
        }))
    })
}

function nearestAliases(sourcePath: string, tsconfigs: Array<{ path: string; aliases: ReturnType<typeof collectAliases> }>) {
  const sourceDir = path.posix.dirname(sourcePath)
  let best: { depth: number; aliases: ReturnType<typeof collectAliases> } | undefined
  for (const config of tsconfigs) {
    const configDir = path.posix.dirname(config.path)
    if (!(sourceDir === configDir || sourceDir.startsWith(configDir + "/"))) continue
    const depth = configDir === "." ? 0 : configDir.split("/").length
    if (!best || depth > best.depth) best = { depth, aliases: config.aliases }
  }
  return best?.aliases ?? []
}

function resolveSpecifier(
  sourcePath: string,
  specifier: string,
  packageNames: Map<string, string>,
  tsconfigs: Array<{ path: string; aliases: ReturnType<typeof collectAliases> }>,
) {
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    return resolveExisting(
      specifier.startsWith("/")
        ? specifier.replace(/^\/+/, "")
        : relativeSpecifier(sourcePath, specifier),
    )
  }

  for (const alias of nearestAliases(sourcePath, tsconfigs)) {
    const pattern = alias.pattern
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -2)
      if (!specifier.startsWith(prefix)) continue
      const capture = specifier.slice(prefix.length)
      const target = alias.target.endsWith("/*") ? alias.target.slice(0, -2) + capture : alias.target
      return resolveExisting(path.posix.join(alias.base, target))
    }
    if (specifier === pattern) return resolveExisting(path.posix.join(alias.base, alias.target))
  }

  let packageName = specifier
  let subpath = ""
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/")
    packageName = parts.slice(0, 2).join("/")
    subpath = parts.slice(2).join("/")
  } else {
    const parts = specifier.split("/")
    packageName = parts[0]
    subpath = parts.slice(1).join("/")
  }
  const packageRoot = packageNames.get(packageName)
  if (!packageRoot) return
  return resolveExisting(path.posix.join(packageRoot, subpath))
}

function addRelation(
  relations: Relation[],
  broken: BrokenRelation[],
  kind: Relation["kind"],
  source: FileEntry,
  specifier: string,
  resolve: () => string | undefined,
) {
  const target = resolve()
  const base = {
    id: "",
    kind,
    sourceID: source.id,
    sourcePath: source.path,
    specifier,
  }
  if (!target) {
    broken.push({ ...base, id: "", reason: "unresolved repository-internal reference" })
    return
  }
  relations.push({ ...base, id: "", targetPath: target })
}

function parseCodeFile(source: FileEntry, text: string, packageNames: Map<string, string>, tsconfigs: Array<{ path: string; aliases: ReturnType<typeof collectAliases> }>, relations: Relation[], broken: BrokenRelation[]) {
  const file = ts.createSourceFile(source.path, text, ts.ScriptTarget.Latest, true, tsKind(source.path))
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      addRelation(relations, broken, "import", source, node.moduleSpecifier.text, () =>
        resolveSpecifier(source.path, node.moduleSpecifier.text, packageNames, tsconfigs),
      )
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      addRelation(relations, broken, "export", source, node.moduleSpecifier.text, () =>
        resolveSpecifier(source.path, node.moduleSpecifier.text, packageNames, tsconfigs),
      )
    } else if (ts.isImportEqualsDeclaration(node)) {
      const ref = node.moduleReference
      if (ts.isExternalModuleReference(ref) && ref.expression && ts.isStringLiteral(ref.expression)) {
        addRelation(relations, broken, "import", source, ref.expression.text, () =>
          resolveSpecifier(source.path, ref.expression.text, packageNames, tsconfigs),
        )
      }
    } else if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
      const arg = node.arguments[0].text
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        addRelation(relations, broken, "dynamic-import", source, arg, () =>
          resolveSpecifier(source.path, arg, packageNames, tsconfigs),
        )
      } else if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
        addRelation(relations, broken, "require", source, arg, () =>
          resolveSpecifier(source.path, arg, packageNames, tsconfigs),
        )
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
}

function parseMarkdown(source: FileEntry, text: string, relations: Relation[], broken: BrokenRelation[]) {
  const regex = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g
  for (const match of text.matchAll(regex)) {
    const raw = match[1]
    if (!raw || /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("#")) continue
    const target = raw.split("#", 1)[0].split("?", 1)[0]
    if (!target) continue
    addRelation(relations, broken, "markdown-link", source, raw, () =>
      resolveExisting(relativeSpecifier(source.path, target)),
    )
  }
}

function parseConfig(source: FileEntry, packageNames: Map<string, string>, fileIDs: Map<string, FileEntry>, relations: Relation[], broken: BrokenRelation[]) {
  if (path.posix.basename(source.path) === "package.json") {
    const json = readJson(source.path)
    const dependencyGroups = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]
    for (const group of dependencyGroups) {
      const deps = (json?.[group] as Record<string, unknown> | undefined) ?? {}
      for (const [name, value] of Object.entries(deps)) {
        if (!packageNames.has(name)) continue
        const target = packageNames.get(name)!
        relations.push({
          id: "",
          kind: "package-dependency",
          sourceID: source.id,
          sourcePath: source.path,
          targetID: fileIDs.get(target)?.id,
          targetPath: target,
          specifier: `${name}@${String(value)}`,
        })
      }
    }
  }

  if (path.posix.basename(source.path) === "tsconfig.json") {
    const json = readJson(source.path)
    const refs = Array.isArray(json?.references) ? json.references : []
    for (const ref of refs) {
      if (!ref || typeof ref !== "object" || typeof (ref as { path?: unknown }).path !== "string") continue
      const raw = String((ref as { path: string }).path)
      addRelation(relations, broken, "tsconfig-reference", source, raw, () =>
        resolveExisting(path.posix.join(path.posix.dirname(source.path), raw)) ??
        resolveExisting(path.posix.join(path.posix.dirname(source.path), raw, "tsconfig.json")),
      )
    }
    if (typeof json?.extends === "string" && json.extends.startsWith(".")) {
      addRelation(relations, broken, "tsconfig-reference", source, String(json.extends), () =>
        resolveExisting(relativeSpecifier(source.path, String(json.extends))),
      )
    }
  }
}

function tarjan(relations: Relation[]) {
  const graph = new Map<string, string[]>()
  for (const r of relations) {
    if (!r.targetID) continue
    const list = graph.get(r.sourceID) ?? []
    list.push(r.targetID)
    graph.set(r.sourceID, list)
  }

  let index = 0
  const indices = new Map<string, number>()
  const low = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const sccs: string[][] = []

  const visit = (node: string) => {
    indices.set(node, index)
    low.set(node, index)
    index++
    stack.push(node)
    onStack.add(node)

    for (const next of graph.get(node) ?? []) {
      if (!indices.has(next)) {
        visit(next)
        low.set(node, Math.min(low.get(node)!, low.get(next)!))
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node)!, indices.get(next)!))
      }
    }

    if (low.get(node) === indices.get(node)) {
      const component: string[] = []
      while (true) {
        const next = stack.pop()!
        onStack.delete(next)
        component.push(next)
        if (next === node) break
      }
      if (component.length > 1) sccs.push(component)
    }
  }

  for (const node of graph.keys()) if (!indices.has(node)) visit(node)
  return sccs
}

const gitFiles = git(["ls-files", "-z"]).split("\0").filter(Boolean).map(normalizeRepoPath).sort((a, b) => a.localeCompare(b))
const files: FileEntry[] = gitFiles.map((filePath, index) => ({
  id: `F${String(index + 1).padStart(6, "0")}`,
  path: filePath,
}))
const fileMap = new Map(files.map((entry) => [entry.path, entry]))
const packageNames = new Map<string, string>()
for (const file of files) {
  if (path.posix.basename(file.path) !== "package.json") continue
  const json = readJson(file.path)
  if (typeof json?.name === "string" && file.path !== "package.json") {
    packageNames.set(json.name, path.posix.dirname(file.path))
  }
}
if (typeof readJson("package.json")?.name === "string") packageNames.set(String(readJson("package.json")!.name), ".")

const tsconfigs = files
  .filter((file) => path.posix.basename(file.path) === "tsconfig.json")
  .map((file) => ({ path: file.path, aliases: collectAliases(file.path) }))

const relations: Relation[] = []
const broken: BrokenRelation[] = []

for (const source of files) {
  const ext = path.posix.extname(source.path).toLowerCase()
  if (SOURCE_EXTENSIONS.has(ext)) {
    parseCodeFile(
      source,
      fs.readFileSync(path.join(ROOT, source.path), "utf8"),
      packageNames,
      tsconfigs,
      relations,
      broken,
    )
  }
  if (TEXT_EXTENSIONS.has(ext)) {
    parseMarkdown(source, fs.readFileSync(path.join(ROOT, source.path), "utf8"), relations, broken)
  }
  if (CONFIG_FILES.has(path.posix.basename(source.path))) {
    parseConfig(source, packageNames, fileMap, relations, broken)
  }
}

const idByPath = new Map(files.map((file) => [file.path, file.id]))
for (const relation of relations) {
  relation.id = `R${String(relations.indexOf(relation) + 1).padStart(7, "0")}`
  relation.targetID = relation.targetPath ? idByPath.get(relation.targetPath) : undefined
}
for (const relation of broken) {
  relation.id = `R${String(relations.length + broken.indexOf(relation) + 1).padStart(7, "0")}`
  if (relation.targetPath) relation.targetID = idByPath.get(relation.targetPath)
}

const indegree = new Map<string, number>()
for (const file of files) indegree.set(file.id, 0)
for (const relation of relations) if (relation.targetID) indegree.set(relation.targetID, (indegree.get(relation.targetID) ?? 0) + 1)

const cycles = tarjan(relations)
const orphanCode = files.filter((file) => {
  const ext = path.posix.extname(file.path).toLowerCase()
  if (!SOURCE_EXTENSIONS.has(ext)) return false
  if (indegree.get(file.id)! > 0) return false
  return !/(^|\/)(index|main|cli|server|entry)\.[^.]+$/i.test(file.path)
})

fs.mkdirSync(AUDIT_DIR, { recursive: true })
fs.writeFileSync(
  path.join(AUDIT_DIR, "files.tsv"),
  ["file_id\tpath", ...files.map((file) => `${file.id}\t${file.path}`)].join("\n") + "\n",
)
fs.writeFileSync(
  path.join(AUDIT_DIR, "relations.tsv"),
  [
    "relation_id\tkind\tsource_id\tsource_path\ttarget_id\ttarget_path\tspecifier",
    ...relations.map((r) => [r.id, r.kind, r.sourceID, r.sourcePath, r.targetID ?? "", r.targetPath ?? "", r.specifier].join("\t")),
  ].join("\n") + "\n",
)
fs.writeFileSync(
  path.join(AUDIT_DIR, "broken.tsv"),
  [
    "relation_id\tkind\tsource_id\tsource_path\tspecifier\treason",
    ...broken.map((r) => [r.id, r.kind, r.sourceID, r.sourcePath, r.specifier, r.reason].join("\t")),
  ].join("\n") + "\n",
)
fs.writeFileSync(
  path.join(AUDIT_DIR, "cycles.txt"),
  cycles.length
    ? cycles.map((component, i) => `cycle_${String(i + 1).padStart(4, "0")}: ${component.join(" -> ")}`).join("\n") + "\n"
    : "",
)
fs.writeFileSync(
  path.join(AUDIT_DIR, "orphans.tsv"),
  ["file_id\tpath", ...orphanCode.map((file) => `${file.id}\t${file.path}`)].join("\n") + "\n",
)

console.log(`runtime-audit: files=${files.length} relations=${relations.length + broken.length} broken=${broken.length} cycles=${cycles.length} code-orphans=${orphanCode.length}`)
console.log(`file index: ${path.relative(ROOT, path.join(AUDIT_DIR, "files.tsv"))}`)
console.log(`relation index: ${path.relative(ROOT, path.join(AUDIT_DIR, "relations.tsv"))}`)
if (broken.length > 0) {
  console.error("Broken repository-internal relationships detected:")
  for (const item of broken.slice(0, 100)) console.error(`${item.id} ${item.sourcePath} -> ${item.specifier}: ${item.reason}`)
  process.exitCode = 1
}
