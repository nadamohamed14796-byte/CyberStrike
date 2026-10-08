import { describe, expect, test } from "bun:test"
import { RESEARCH_SOURCES, getResearchSource } from "../../src/research/sources"

describe("research source registry", () => {
  test("contains the configured public learning sources", () => {
    expect(RESEARCH_SOURCES.length).toBeGreaterThanOrEqual(20)
    expect(getResearchSource("hackerone-hacktivity")?.trust).toBe(95)
    expect(getResearchSource("portswigger")?.kind).toBe("academy")
    expect(getResearchSource("payloadsallthethings")?.hosts).toContain("github.com")
  })

  test("every source has HTTPS seeds and host allowlists", () => {
    for (const source of RESEARCH_SOURCES) {
      expect(source.seedUrls.length).toBeGreaterThan(0)
      expect(source.hosts.length).toBeGreaterThan(0)
      for (const url of source.seedUrls) expect(new URL(url).protocol).toBe("https:")
    }
  })
})
