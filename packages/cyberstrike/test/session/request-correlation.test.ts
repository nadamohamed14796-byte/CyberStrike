import { describe, expect, test } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { Request } from "../../src/session/request"
import { TargetMemory } from "../../src/session/target-memory"
import { WebCredential } from "../../src/session/web/web-credential"
import { ToolArtifact } from "../../src/tool/artifact"
import { RequestCorrelation } from "../../src/session/request-correlation"

const projectRoot = path.join(__dirname, "../..")

describe("RequestCorrelation", () => {
  test("builds the JS -> request -> artifact graph with account provenance", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const session = await Session.create({})
        const credential = WebCredential.add({
          sessionID: session.id,
          label: "admin-user",
        })

        const request = Request.add({
          sessionID: session.id,
          method: "GET",
          normalizedPath: "/app.js",
          canonicalPath: "/app.js",
          scheme: "https",
          host: "api.example.com",
          port: 443,
          credentialID: credential.id,
          response: {
            status: 200,
            headers: { "content-type": "application/javascript" },
            body: "console.log('hello')",
          },
        })

        expect(request).toBeDefined()
        const script = TargetMemory.listForSession(session.id, "javascript", 100).find(
          (item) => item.request_id === request?.id,
        )
        expect(script).toBeDefined()

        ToolArtifact.record({
          sessionID: session.id,
          requestID: request?.id,
          credentialID: credential.id,
          tool: "http_replay",
          signal: "completed",
          output: "script fetched",
        })

        const node = RequestCorrelation.forRequest(session.id, request!.id)
        expect(node?.request.id).toBe(request?.id)
        expect(node?.javascript.some((item) => item.id === script?.id)).toBe(true)
        expect(node?.artifacts.some((item) => item.request_id === request?.id)).toBe(true)

        const reverse = RequestCorrelation.forJavascript(session.id, script!)
        expect(reverse.requests.some((item) => item.id === request?.id)).toBe(true)
        expect(reverse.artifacts.some((item) => item.request_id === request?.id)).toBe(true)

        await Session.remove(session.id)
      },
    })
  })
})
