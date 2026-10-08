import { describe, expect, test } from "bun:test"
import { validateSkillSet, type SkillInventoryItem, type RegistryEntry } from "../../script/validate-skills"

function skill(name: string, overrides: Partial<SkillInventoryItem> = {}): SkillInventoryItem {
  return {
    path: "/tmp/" + name + "/SKILL.md",
    name,
    description: name + " skill",
    chains_with: [],
    prerequisites: [],
    severity_boost: {},
    files: [],
    ...overrides,
  }
}

describe("skill registry validator", () => {
  test("finds duplicate and missing chain references", () => {
    const report = validateSkillSet(
      [skill("router", { chains_with: ["specialist", "missing"] }), skill("router"), skill("specialist")],
      [{ name: "router" }],
    )
    expect(report.duplicateNames).toEqual(["router"])
    expect(report.brokenChains).toEqual([{ skill: "router", target: "missing" }])
    expect(report.orphanRegistryEntries).toEqual([])
    expect(report.unindexedSkillNames).toEqual(["specialist"])
  })

  test("distinguishes known skill prerequisites from external identifiers", () => {
    const report = validateSkillSet([skill("router", { prerequisites: ["specialist", "T1634"] })], [])
    expect(report.unknownPrerequisites).toEqual([{ skill: "router", prerequisite: "specialist" }])
  })

  test("detects orphan registry entries and duplicate registry names", () => {
    const report = validateSkillSet([skill("router")], [{ name: "router" }, { name: "router" }, { name: "missing" }])
    expect(report.registryDuplicates).toEqual(["router"])
    expect(report.orphanRegistryEntries).toEqual(["missing"])
  })
})
