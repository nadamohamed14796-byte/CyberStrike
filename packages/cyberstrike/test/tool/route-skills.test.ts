import { describe, expect, test } from "bun:test"
import { RouteSkillsTool } from "../../src/tool/route-skills"

const ctx = { sessionID: "test", messageID: "", callID: "", agent: "build", abort: new AbortController().signal, metadata() {}, async ask() {} } as any

describe("route_skills tool", () => {
  test("returns the skills for known signals and names the unknown ones", async () => {
    const tool = await RouteSkillsTool.init()
    const result = await tool.execute({ signals: ["jwt_detected", "something_new"] }, ctx)
    expect(result.metadata.skills).toEqual(["attack-jwt"])
    expect(result.metadata.unknown).toEqual(["something_new"])
    expect(result.output).toContain("attack-jwt")
    expect(result.output).toContain("something_new")
  })

  test("says so when nothing is mapped", async () => {
    const tool = await RouteSkillsTool.init()
    const result = await tool.execute({ signals: ["nothing_here"] }, ctx)
    expect(result.output).toContain("No skill is mapped")
  })
})
