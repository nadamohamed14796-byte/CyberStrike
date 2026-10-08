import path from "path"
import { Log } from "../util/log"
import { Skill } from "./skill"
import { Instance } from "../project/instance"

export namespace SkillIndex {
  const log = Log.create({ service: "skill-index" })

  export type Entry = {
    name: string
    description: string
    category?: string
    owasp_id?: string
    tags: string[]
    tech_stack: string[]
    cwe_ids: string[]
    chains_with: string[]
    prerequisites: string[]
    severity_boost: Record<string, string>
    verified?: string
  }

  type State = {
    entries: Map<string, Entry>
    tagIndex: Map<string, Set<string>>
    techIndex: Map<string, Set<string>>
    cweIndex: Map<string, Set<string>>
    categoryIndex: Map<string, Set<string>>
    aliasIndex: Map<string, string>
    initialized: boolean
  }

  function createState(): State {
    return {
      entries: new Map(),
      tagIndex: new Map(),
      techIndex: new Map(),
      cweIndex: new Map(),
      categoryIndex: new Map(),
      aliasIndex: new Map(),
      initialized: false,
    }
  }

  const state = Instance.state(createState)
  const standaloneState = createState()

  // Read-only helpers remain safe for small standalone callers (for example,
  // kill-chain validation before a project is initialized). Building the index
  // still requires an Instance because Skill.state is project-scoped.
  function currentState(): State {
    try {
      return state()
    } catch {
      return standaloneState
    }
  }

  function toEntry(skill: Skill.Info): Entry {
    return {
      name: skill.name,
      description: skill.description,
      category: skill.category,
      owasp_id: skill.owasp_id,
      tags: skill.tags ?? [],
      tech_stack: skill.tech_stack ?? [],
      cwe_ids: skill.cwe_ids ?? [],
      chains_with: skill.chains_with ?? [],
      prerequisites: skill.prerequisites ?? [],
      severity_boost: skill.severity_boost ?? {},
      verified: skill.verified,
    }
  }

  function indexEntry(state: State, entry: Entry) {
    for (const tag of entry.tags) {
      const key = tag.toLowerCase()
      if (!state.tagIndex.has(key)) state.tagIndex.set(key, new Set())
      state.tagIndex.get(key)!.add(entry.name)
    }
    for (const tech of entry.tech_stack) {
      const key = tech.toLowerCase()
      if (!state.techIndex.has(key)) state.techIndex.set(key, new Set())
      state.techIndex.get(key)!.add(entry.name)
    }
    for (const cwe of entry.cwe_ids) {
      const key = cwe.toUpperCase()
      if (!state.cweIndex.has(key)) state.cweIndex.set(key, new Set())
      state.cweIndex.get(key)!.add(entry.name)
    }
    if (entry.category) {
      const key = entry.category.toLowerCase()
      if (!state.categoryIndex.has(key)) state.categoryIndex.set(key, new Set())
      state.categoryIndex.get(key)!.add(entry.name)
    }
  }

  export async function ensureBuilt() {
    if (currentState().initialized) return
    await rebuild()
  }

  export async function rebuild() {
    const current = state()
    current.initialized = false
    current.entries.clear()
    current.tagIndex.clear()
    current.techIndex.clear()
    current.cweIndex.clear()
    current.categoryIndex.clear()
    current.aliasIndex.clear()

    const skills = await Skill.all()
    for (const skill of skills) {
      const entry = toEntry(skill)
      current.entries.set(entry.name, entry)
      indexEntry(current, entry)

      const directoryName = path.basename(path.dirname(skill.location))
      if (directoryName && directoryName !== entry.name && /^[a-z0-9][a-z0-9._-]*$/i.test(directoryName)) {
        const existing = current.aliasIndex.get(directoryName)
        if (existing && existing !== entry.name) {
          current.aliasIndex.delete(directoryName)
        } else if (!existing && !current.entries.has(directoryName)) {
          current.aliasIndex.set(directoryName, entry.name)
        }
      }
    }
    log.info("skill index built", { count: current.entries.size, directory: Instance.directory })
    current.initialized = true
  }

  export function get(name: string): Entry | undefined {
    return currentState().entries.get(name) ?? currentState().entries.get(currentState().aliasIndex.get(name) ?? "")
  }

  export function all(): Entry[] {
    return Array.from(currentState().entries.values())
  }

  export function search(query: string, limit = 50): Entry[] {
    const q = query.toLowerCase()
    const scored: Array<{ entry: Entry; score: number }> = []
    for (const entry of currentState().entries.values()) {
      let score = 0
      if (entry.name.toLowerCase() === q) score += 100
      else if (entry.name.toLowerCase().startsWith(q)) score += 50
      else if (entry.name.toLowerCase().includes(q)) score += 20
      if (entry.tags.some((t) => t.toLowerCase() === q)) score += 40
      else if (entry.tags.some((t) => t.toLowerCase().includes(q))) score += 15
      if (entry.owasp_id?.toLowerCase().includes(q)) score += 30
      if (entry.category?.toLowerCase().includes(q)) score += 10
      if (entry.description.toLowerCase().includes(q)) score += 5
      if (score > 0) scored.push({ entry, score })
    }
    return scored
      .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
      .slice(0, limit)
      .map((s) => s.entry)
  }

  export function byTechStack(stack: string[], limit = 50): Entry[] {
    const names = new Set<string>()
    for (const tech of stack) {
      const set = currentState().techIndex.get(tech.toLowerCase())
      if (set) for (const name of set) names.add(name)
    }
    const results = Array.from(names)
      .map((n) => currentState().entries.get(n)!)
      .filter(Boolean)
    return results.slice(0, limit)
  }

  export function byCWE(cweId: string, limit = 50): Entry[] {
    const set = currentState().cweIndex.get(cweId.toUpperCase())
    if (!set) return []
    return Array.from(set)
      .slice(0, limit)
      .map((n) => currentState().entries.get(n)!)
      .filter(Boolean)
  }

  export function byCategory(cat: string, limit = 50): Entry[] {
    const set = currentState().categoryIndex.get(cat.toLowerCase())
    if (!set) return []
    return Array.from(set)
      .slice(0, limit)
      .map((n) => currentState().entries.get(n)!)
      .filter(Boolean)
  }

  export function byTag(tag: string, limit = 50): Entry[] {
    const set = currentState().tagIndex.get(tag.toLowerCase())
    if (!set) return []
    return Array.from(set)
      .map((n) => currentState().entries.get(n)!)
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit)
  }

  export function prerequisitesSatisfied(skillName: string, available: Iterable<string>): boolean {
    const availableSet = new Set(available)
    return prerequisitesFor(skillName).every((name) => availableSet.has(name))
  }

  export function rankForContext(input: {
    query?: string
    tech?: string[]
    cwe?: string
    category?: string
    availableSkills?: string[]
    limit?: number
  }): Array<Entry & { score: number; prerequisitesSatisfied: boolean }> {
    const candidates = input.cwe
      ? byCWE(input.cwe, Infinity)
      : input.tech?.length
        ? byTechStack(input.tech, Infinity)
        : input.category
          ? byCategory(input.category, Infinity)
          : input.query
            ? search(input.query, Infinity)
            : all()
    const available = input.availableSkills ?? []
    const scored = candidates.map((entry) => {
      let score = 0
      if (input.query) {
        const q = input.query.toLowerCase()
        if (entry.name.toLowerCase() === q) score += 100
        if (entry.description.toLowerCase().includes(q)) score += 10
      }
      if (input.tech?.length)
        score += input.tech.filter((x) => entry.tech_stack.some((t) => t.toLowerCase() === x.toLowerCase())).length * 20
      if (input.cwe) score += entry.cwe_ids.some((x) => x.toUpperCase() === input.cwe!.toUpperCase()) ? 30 : 0
      if (input.category) score += entry.category?.toLowerCase() === input.category.toLowerCase() ? 20 : 0
      const ready = prerequisitesSatisfied(entry.name, available)
      if (ready) score += 15
      else score -= 15
      return { ...entry, score, prerequisitesSatisfied: ready }
    })
    return scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, input.limit ?? 20)
  }

  export function chainsFrom(skillName: string): Array<{ target: string; boost?: string }> {
    const entry = get(skillName)
    if (!entry) return []
    return entry.chains_with.map((target) => ({
      target,
      boost: entry.severity_boost[target],
    }))
  }

  export function prerequisitesFor(skillName: string): string[] {
    const entry = get(skillName)
    if (!entry) return []
    return entry.prerequisites
  }
}
