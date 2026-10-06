import { describe, expect, test } from "bun:test"
import { ContextBudgetManager } from "../../src/methodology/context-budget"
describe("ContextBudgetManager", () => {
  test("deduplicates and prioritizes context within a phase budget", () => {
    const result = ContextBudgetManager.prioritize([{ id:"a", text:"low", score:1 }, { id:"a", text:"higher", score:9 }, { id:"b", text:"medium", score:5 }], "recon", { tokens:3, maxItems:2, maxItemChars:100 })
    expect(result.selected.map((x) => x.id)).toEqual(["a"])
    expect(result.dropped).toBe(1)
    expect(result.estimatedTokens).toBeLessThanOrEqual(3)
  })
  test("summarizes selected data instead of the raw corpus", () => {
    const result = ContextBudgetManager.summarize("js", [{ id:"one", text:"endpoint /api/users", score:10 }, { id:"two", text:"large raw blob ".repeat(100), score:1 }])
    expect(result.text).toContain("endpoint /api/users")
    expect(result.text.length).toBeLessThan(5000)
  })
})