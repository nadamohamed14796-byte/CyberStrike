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
  expect(SignalQueue.list(sessions.pending, -1)).toHaveLength(0)
  expect(SignalQueue.list(sessions.pending, Number.NaN)).toHaveLength(1)
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

test("deduplicates enqueues, permits only one concurrent claim, and recovers interrupted work", async () => {
  const sessions = createLearningTestSessions("signal-queue-recovery", ["recover"])
  const input = {
    sessionID: sessions.recover,
    signal: "learning-test:stale-recovery-marker",
    target: "recovery.example",
    maxAttempts: 2,
  }
  const id = SignalQueue.enqueue(input)
  expect(SignalQueue.enqueue(input)).toBe(id)

  const claims = await Promise.all([
    Promise.resolve().then(() => SignalQueue.markRunning(id)),
    Promise.resolve().then(() => SignalQueue.markRunning(id)),
  ])
  expect(claims.filter(Boolean)).toHaveLength(1)
  expect(SignalQueue.get(id)?.attempts).toBe(1)

  const firstRecovery = SignalQueue.recover(sessions.recover, 0)
  expect(firstRecovery).toEqual({ recovered: 1, requeued: 1, failed: 0 })
  expect(SignalQueue.get(id)?.status).toBe("pending")

  expect(SignalQueue.markRunning(id)).toBe(true)
  expect(SignalQueue.get(id)?.attempts).toBe(2)
  const exhaustedRecovery = SignalQueue.recover(sessions.recover, 0)
  expect(exhaustedRecovery).toEqual({ recovered: 1, requeued: 0, failed: 1 })
  expect(SignalQueue.get(id)?.status).toBe("failed")
  SignalQueue.retry(id)
  expect(SignalQueue.get(id)?.status).toBe("failed")
})

test("signal queue bounds non-finite and out-of-range retry/depth budgets", () => {
  const sessions = createLearningTestSessions("signal-queue-budget-bounds", ["bounds"])
  const id = SignalQueue.enqueue({
    sessionID: sessions.bounds,
    signal: "learning-test:invalid-budget-marker",
    depth: Number.NaN,
    maxAttempts: Number.POSITIVE_INFINITY,
  })

  const row = SignalQueue.get(id)
  expect(row?.depth).toBe(0)
  expect(row?.max_attempts).toBe(1)

  const excessive = SignalQueue.enqueue({
    sessionID: sessions.bounds,
    signal: "learning-test:maximum-budget-marker",
    depth: 10_000,
    maxAttempts: 10_000,
  })
  expect(SignalQueue.get(excessive)?.depth).toBe(32)
  expect(SignalQueue.get(excessive)?.max_attempts).toBe(20)
})
