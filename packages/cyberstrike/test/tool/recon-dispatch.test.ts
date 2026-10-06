import { describe, expect, test } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { ReconDispatch } from "../../src/tool/recon-dispatch"

describe("ReconDispatch", () => {
  test("requires programmatic scope for active-read recon", async () => {
    await Instance.provide({
      directory: path.join(__dirname, "../.."),
      fn: async () => {
        const session = await Session.create({})
        expect(ReconDispatch.next({ sessionID: session.id, signal: "live HTTP", target: "example.com", scope_verified: true })).toEqual([])
        expect(ReconDispatch.next({ sessionID: session.id, signal: "live HTTP", target: "example.com", scope_items: ["example.com"] }).some((tool) => tool.id === "httpx")).toBe(true)
        await Session.remove(session.id)
      },
    })
  })

  test("exposes an anti-loop planner", () => {
    expect(typeof ReconDispatch.next).toBe("function")
  })
})
