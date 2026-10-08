import { describe, expect, test } from "bun:test"
import { RESEARCH_SOURCES } from "../../src/research/sources"
import { candidateScore } from "../../src/research/ingest"

describe("research source registry", () => {
  test("contains the configured public learning sources", () => {
    expect(RESEARCH_SOURCES.length).toBeGreaterThanOrEqual(20)
    for (const id of [
      "hackerone-hacktivity",
      "bugcrowd-crowdstream",
      "intigriti",
      "yeswehack",
      "portswigger",
      "pentesterland",
      "medium",
      "infosec-writeups",
      "hackerone-blog",
      "bugcrowd-blog",
      "nahamsec",
      "assetnote",
      "projectdiscovery",
      "trickster0",
      "edoverflow",
      "devcore",
      "liveoverflow",
      "hacktricks",
      "payloadsallthethings",
      "github",
    ]) {
      expect(RESEARCH_SOURCES.some((source) => source.id === id)).toBe(true)
    }
  })

  test("keeps research hosts restricted to the configured source", () => {
    for (const source of RESEARCH_SOURCES) {
      expect(source.hosts.length).toBeGreaterThan(0)
      for (const seed of source.seedUrls) expect(new URL(seed).protocol).toBe("https:")
    }
  })

  test("prioritizes report and research documents over generic landing pages", () => {
    const source = RESEARCH_SOURCES.find((item) => item.id === "hackerone-hacktivity")!
    expect(candidateScore("https://hackerone.com/hacktivity", source)).toBeLessThan(
      candidateScore("https://hackerone.com/reports/123456", source),
    )
  })
})
