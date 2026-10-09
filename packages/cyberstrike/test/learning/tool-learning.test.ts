import { expect, test } from "bun:test"
import { ToolLearning } from "../../src/learning/tool-learning"
import { createLearningTestSessions } from "./test-session"

test("scores tool feedback consistently regardless of identifier case or whitespace", () => {
  const signal = "learning-test:ToolScoreCaseNormalizationMarker"
  ToolLearning.observe({
    tool: "  HttpX  ",
    signal,
    outcome: "useful",
    evidence: "Deterministic regression fixture",
  })

  expect(ToolLearning.score("HttpX", signal)).toBe(100)
  expect(ToolLearning.score("HTTPX", signal)).toBe(100)
  expect(ToolLearning.score("httpx", signal)).toBe(100)
})

test("keeps unscoped tool feedback out of existing session scores", () => {
  const signal = "learning-test:ToolSessionIsolationMarker"
  const sessions = createLearningTestSessions("tool-learning", ["alpha", "beta"])

  ToolLearning.observe({
    tool: "ScopeProbe",
    signal,
    sessionID: sessions.alpha,
    outcome: "useful",
  })
  ToolLearning.observe({
    tool: "ScopeProbe",
    signal,
    sessionID: sessions.beta,
    outcome: "rejected",
  })

  expect(ToolLearning.score("ScopeProbe", signal, sessions.alpha)).toBe(100)
  expect(ToolLearning.score("ScopeProbe", signal, sessions.beta)).toBe(0)
  expect(ToolLearning.recent(-1)).toHaveLength(0)
  expect(ToolLearning.recent(Number.NaN).length).toBeGreaterThan(0)

  // Feedback without a session belongs to its own NULL-session row, rather
  // than mutating whichever session-specific row SQLite happens to return first.
  ToolLearning.observe({ tool: "ScopeProbe", signal, outcome: "rejected" })

  expect(ToolLearning.score("ScopeProbe", signal, sessions.alpha)).toBe(100)
  expect(ToolLearning.score("ScopeProbe", signal, sessions.beta)).toBe(0)
})
