import { describe, expect, test } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { TargetMemory } from "../../src/session/target-memory"

const projectRoot = path.join(__dirname, "../..")

describe("TargetMemory discovery promotion", () => {
  test("merges provenance when the same URL is discovered by multiple tools", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const session = await Session.create({})
        TargetMemory.rememberDiscovery(session.id, {
          tool: "subfinder",
          output: "https://api.example.com/users",
          signal: "asset",
          callID: "call-a",
        })
        TargetMemory.rememberDiscovery(session.id, {
          tool: "katana",
          output: "https://api.example.com/users",
          signal: "endpoint",
          callID: "call-b",
        })

        const row = TargetMemory.listForSession(session.id, "endpoint", 100)
          .find((item) => item.url === "https://api.example.com/users")

        expect(row).toBeDefined()
        expect(row?.metadata?.source_tools).toEqual(["subfinder", "katana"])
        expect(row?.metadata?.source_call_ids).toEqual(["call-a", "call-b"])

        await Session.remove(session.id)
      },
    })
  })
})
