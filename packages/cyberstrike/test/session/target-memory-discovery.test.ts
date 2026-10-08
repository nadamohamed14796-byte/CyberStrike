import { describe, expect, test } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { TargetMemory } from "../../src/session/target-memory"
import { Request } from "../../src/session/request"

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

        const row = TargetMemory.listForSession(session.id, "endpoint", 100).find(
          (item) => item.url === "https://api.example.com/users",
        )

        expect(row).toBeDefined()
        expect(row?.metadata?.source_tools).toEqual(["subfinder", "katana"])
        expect(row?.metadata?.source_call_ids).toEqual(["call-a", "call-b"])

        await Session.remove(session.id)
      },
    })
  })

  test("links discovered JavaScript to its canonical request and preserves credential provenance", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const session = await Session.create({})
        TargetMemory.rememberDiscovery(session.id, {
          tool: "subjs",
          output: "https://api.example.com/app.js",
          signal: "JavaScript",
          callID: "call-js",
        })

        const request = Request.add({
          sessionID: session.id,
          method: "GET",
          normalizedPath: "/app.js",
          canonicalPath: "/app.js",
          scheme: "https",
          host: "api.example.com",
          port: 443,
          credentialID: "cred-admin",
          response: {
            status: 200,
            headers: { "content-type": "application/javascript" },
            body: "fetch('/api/users?next=1')",
          },
        })

        expect(request).toBeDefined()

        const script = TargetMemory.listForSession(session.id, "javascript", 100).find(
          (item) => item.url === "https://api.example.com/app.js",
        )
        expect(script?.request_id).toBe(request?.id)
        expect(script?.metadata?.credential_id).toBe("cred-admin")
        expect(script?.metadata?.request_ids).toContain(request?.id)

        const endpoint = TargetMemory.listForSession(session.id, "endpoint", 100).find(
          (item) => item.url === "https://api.example.com/api/users?next=1",
        )
        expect(endpoint?.metadata?.source_request_ids).toContain(request?.id)

        await Session.remove(session.id)
      },
    })
  })
})
