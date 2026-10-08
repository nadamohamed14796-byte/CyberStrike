import { describe, expect, test } from "bun:test"
import crypto from "node:crypto"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { ReconDispatch } from "../../src/tool/recon-dispatch"
import { SignalQueue } from "../../src/tool/signal-queue"

describe("ReconDispatch", () => {
  test("requires programmatic scope for active-read recon", async () => {
    await Instance.provide({
      directory: path.join(__dirname, "../.."),
      fn: async () => {
        const session = await Session.create({})
        expect(
          ReconDispatch.next({
            sessionID: session.id,
            signal: "live HTTP",
            target: "example.com",
            scope_verified: true,
          }),
        ).toEqual([])
        expect(
          ReconDispatch.next({
            sessionID: session.id,
            signal: "live HTTP",
            target: "example.com",
            scope_items: ["example.com"],
          }).some((tool) => tool.id === "httpx"),
        ).toBe(true)
        await Session.remove(session.id)
      },
    })
  })

  test("does not let completed coverage on one target suppress another target", async () => {
    await Instance.provide({
      directory: path.join(__dirname, "../.."),
      fn: async () => {
        const session = await Session.create({})
        const signal = `live HTTP target isolation ${crypto.randomUUID()}`
        const first = SignalQueue.enqueue({
          sessionID: session.id,
          signal,
          target: "one.example",
        })
        const second = SignalQueue.enqueue({
          sessionID: session.id,
          signal,
          target: "two.example",
        })

        expect(SignalQueue.markRunning(first)).toBe(true)
        SignalQueue.complete(first)

        expect(SignalQueue.next(session.id)?.id).toBe(second)
        await Session.remove(session.id)
      },
    })
  })

  test("exposes an anti-loop planner", () => {
    expect(typeof ReconDispatch.next).toBe("function")
  })
})
