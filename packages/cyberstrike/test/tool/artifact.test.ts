import { describe, expect, test } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { ToolArtifact } from "../../src/tool/artifact"

const projectRoot = path.join(__dirname, "../..")

describe("tool artifact provenance contract", () => {
  test("exposes the durable provenance API", () => {
    expect(typeof ToolArtifact.record).toBe("function")
    expect(typeof ToolArtifact.list).toBe("function")
    expect(typeof ToolArtifact.byCall).toBe("function")
  })

  test("redacts credential-like input fields before persistence", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const session = await Session.create({})
        const id = ToolArtifact.record({
          sessionID: session.id,
          callID: "call-secret",
          tool: "external_tool",
          input: {
            target: "https://example.com",
            Authorization: "Bearer super-secret",
            nested: { password: "p@ss", safe: "ok" },
          },
        })
        const row = ToolArtifact.byCall(session.id, "call-secret")
        expect(row?.id).toBe(id)
        expect(row?.input?.Authorization).toBe("[REDACTED]")
        expect((row?.input?.nested as Record<string, unknown>).password).toBe("[REDACTED]")
        expect((row?.input?.nested as Record<string, unknown>).safe).toBe("ok")
        await Session.remove(session.id)
      },
    })
  })
})
