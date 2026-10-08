import { describe, expect, test } from "bun:test"
import path from "path"
import crypto from "node:crypto"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { SignalQueue } from "../../src/tool/signal-queue"

describe("SignalQueue concurrency", () => {
  test("deduplicates concurrent enqueue calls without surfacing unique races", async () => {
    await Instance.provide({
      directory: path.join(__dirname, "../.."),
      fn: async () => {
        const session = await Session.create({})
        const signal = `concurrent-enqueue-${crypto.randomUUID()}`
        const ids = await Promise.all(
          Array.from({ length: 20 }, () =>
            Promise.resolve(
              SignalQueue.enqueue({
                sessionID: session.id,
                signal,
                target: "race.example",
              }),
            ),
          ),
        )

        expect(new Set(ids).size).toBe(1)
        expect(SignalQueue.list(session.id).filter((x) => x.dedup_key.endsWith("race.example")).length).toBe(1)
        await Session.remove(session.id)
      },
    })
  })
})

describe("SignalQueue recovery", () => {
  test("requeues stale work when another attempt remains", async () => {
    await Instance.provide({
      directory: path.join(__dirname, "../.."),
      fn: async () => {
        const session = await Session.create({})
        const signal = `recovery-requeue-${crypto.randomUUID()}`
        const id = SignalQueue.enqueue({
          sessionID: session.id,
          signal,
          target: "recover.example",
          maxAttempts: 2,
        })

        expect(SignalQueue.markRunning(id)).toBe(true)
        const recovered = SignalQueue.recover(session.id, 0)
        expect(recovered).toEqual({ recovered: 1, requeued: 1, failed: 0 })
        expect(SignalQueue.get(id)?.status).toBe("pending")
        expect(SignalQueue.get(id)?.attempts).toBe(1)
        expect(SignalQueue.next(session.id)?.id).toBe(id)

        await Session.remove(session.id)
      },
    })
  })

  test("terminally fails stale work when its attempt budget is exhausted", async () => {
    await Instance.provide({
      directory: path.join(__dirname, "../.."),
      fn: async () => {
        const session = await Session.create({})
        const signal = `recovery-fail-${crypto.randomUUID()}`
        const id = SignalQueue.enqueue({
          sessionID: session.id,
          signal,
          target: "recover.example",
          maxAttempts: 1,
        })

        expect(SignalQueue.markRunning(id)).toBe(true)
        const recovered = SignalQueue.recover(session.id, 0)
        expect(recovered).toEqual({ recovered: 1, requeued: 0, failed: 1 })
        expect(SignalQueue.get(id)?.status).toBe("failed")
        expect(SignalQueue.next(session.id)).toBeUndefined()

        await Session.remove(session.id)
      },
    })
  })
})
