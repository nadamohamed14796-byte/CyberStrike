import { expect, test } from "bun:test"
import { SignalQueue } from "../../src/tool/signal-queue"
import { createLearningTestSessions } from "./test-session"

test("signal queue claims atomically and rejects illegal terminal transitions", () => {
  const sessions = createLearningTestSessions("signal-queue-transitions", ["pending", "running"])
  const pendingID = SignalQueue.enqueue({
    sessionID: sessions.pending,
    signal: "learning-test:pending-transition",
    target: "scope.example",
    maxAttempts: 2,
  })

  expect(SignalQueue.get(pendingID)?.status).toBe("pending")
  SignalQueue.complete(pendingID)
  SignalQueue.fail(pendingID)
  expect(SignalQueue.get(pendingID)?.status).toBe("pending")

  expect(SignalQueue.markRunning(pendingID)).toBe(true)
  expect(SignalQueue.markRunning(pendingID)).toBe(false)
  expect(SignalQueue.get(pendingID)?.attempts).toBe(1)

  SignalQueue.complete(pendingID)
  expect(SignalQueue.get(pendingID)?.status).toBe("completed")
  SignalQueue.fail(pendingID)
  SignalQueue.skip(pendingID)
  SignalQueue.retry(pendingID)
  expect(SignalQueue.get(pendingID)?.status).toBe("completed")

  const runningID = SignalQueue.enqueue({
    sessionID: sessions.running,
    signal: "learning-test:running-transition",
    target: "scope.example",
    maxAttempts: 2,
  })
  expect(SignalQueue.markRunning(runningID)).toBe(true)
  SignalQueue.fail(runningID)
  expect(SignalQueue.get(runningID)?.status).toBe("failed")
  SignalQueue.complete(runningID)
  expect(SignalQueue.get(runningID)?.status).toBe("failed")
  expect(SignalQueue.retry(runningID)).toBeDefined()
  expect(SignalQueue.get(runningID)?.status).toBe("pending")
})

test("signal queue retry stops at max attempts", () => {
  const sessions = createLearningTestSessions("signal-queue-retries", ["retry"])
  const id = SignalQueue.enqueue({
    sessionID: sessions.retry,
    signal: "learning-test:retry-limit",
    target: "scope.example",
    maxAttempts: 1,
  })

  expect(SignalQueue.markRunning(id)).toBe(true)
  expect(SignalQueue.get(id)?.attempts).toBe(1)
  SignalQueue.fail(id)
  expect(SignalQueue.get(id)?.status).toBe("failed")
  SignalQueue.retry(id)
  expect(SignalQueue.get(id)?.status).toBe("failed")
})
