import { describe, expect, test } from "bun:test"
import { discoverySeeds, sourceDocumentPriority } from "../../src/research/adapters"
import { getResearchSource } from "../../src/research/sources"

describe("research discovery adapters", () => {
  test("expands public archive pagination for HackerOne", () => {
    const source = getResearchSource("hackerone-hacktivity")!
    const seeds = discoverySeeds(source, 4)
    expect(seeds).toContain("https://hackerone.com/hacktivity?page=2")
    expect(seeds).toContain("https://hackerone.com/hacktivity?page=4")
  })

  test("keeps Medium focused on bug-bounty surfaces", () => {
    const source = getResearchSource("medium")!
    const seeds = discoverySeeds(source, 3)
    expect(seeds).toContain("https://medium.com/tag/bug-bounty/archive?page=2")
    expect(sourceDocumentPriority(source, "https://medium.com/tag/bug-bounty/archive?page=2")).toBeGreaterThan(0)
    expect(sourceDocumentPriority(source, "https://medium.com/tag/programming/archive?page=2")).toBe(0)
  })

  test("does not create cross-host discovery URLs", () => {
    const source = getResearchSource("github")!
    for (const url of discoverySeeds(source, 5)) expect(new URL(url).hostname).toBe("github.com")
  })
})
