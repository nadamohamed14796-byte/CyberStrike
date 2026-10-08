import { describe, expect, test } from "bun:test"
import { ChainRegistry } from "../../src/skill/chain-registry"
import { SkillIndex } from "../../src/skill/index-engine"
import { Instance } from "../../src/project/instance"
import path from "path"

describe("ChainRegistry", () => {
  const projectRoot = path.resolve(import.meta.dir, "../../../..")
  async function withIndex<T>(fn: () => T | Promise<T>) {
    return Instance.provide({
      directory: projectRoot,
      fn: async () => {
        await SkillIndex.ensureBuilt()
        return fn()
      },
    })
  }

  test("rejects unknown and self-loop targets", () => {
    expect(ChainRegistry.known("definitely-not-a-skill")).toBe(false)
    expect(ChainRegistry.eligible("auth-sec", "auth-sec", [])).toBe(false)
  })

  test("deduplicates and requires prerequisites", async () => {
    await withIndex(() => {
      const evidence = { state: "validated" as const, key: "test-evidence" }
      const plans = ChainRegistry.next({ from: "auth-sec", completed: [], evidence })
      expect(new Set(plans.map((x) => x.skill)).size).toBe(plans.length)
      expect(plans.every((x) => x.evidence.key === "test-evidence")).toBe(true)
    })
  })

  test("bounds chain walking", async () => {
    await withIndex(() => {
      const result = ChainRegistry.walk({
        start: "auth-sec",
        evidence: { state: "observed", key: "bounded-test" },
        maxHops: 100,
      })
      expect(result.transitions.length).toBeLessThanOrEqual(ChainRegistry.LIMITS.maxHops)
      expect(result.skills.length).toBeLessThanOrEqual(ChainRegistry.LIMITS.maxUniqueSkills)
    })
  })

  test("rejects chain expansion from an unpromoted signal state", async () => {
    await withIndex(() => {
      const result = ChainRegistry.next({
        from: "auth-sec",
        completed: ["auth-sec"],
        evidence: { state: "signal", key: "raw-signal" },
      })
      expect(result).toEqual([])
    })
  })
})
