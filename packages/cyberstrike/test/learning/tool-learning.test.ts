import { expect, test } from "bun:test"
import { ToolLearning } from "../../src/learning/tool-learning"

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

  ToolLearning.observe({
    tool: "ScopeProbe",
    signal,
    sessionID: "learning-session-alpha",
    outcome: "useful",
  })
  ToolLearning.observe({
    tool: "ScopeProbe",
    signal,
    sessionID: "learning-session-beta",
    outcome: "rejected",
  })

  expect(ToolLearning.score("ScopeProbe", signal, "learning-session-alpha")).toBe(100)
  expect(ToolLearning.score("ScopeProbe", signal, "learning-session-beta")).toBe(0)

  // Feedback without a session belongs to its own NULL-session row, rather
  // than mutating whichever session-specific row SQLite happens to return first.
  ToolLearning.observe({ tool: "ScopeProbe", signal, outcome: "rejected" })

  expect(ToolLearning.score("ScopeProbe", signal, "learning-session-alpha")).toBe(100)
  expect(ToolLearning.score("ScopeProbe", signal, "learning-session-beta")).toBe(0)
})
