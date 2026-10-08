import { describe, expect, test } from "bun:test"
import { isResumableTaskSession } from "../../src/tool/task"

describe("subagent task resume", () => {
  const session = (parentID: string | undefined): Parameters<typeof isResumableTaskSession>[0]["session"] =>
    ({
      id: "session_test",
      slug: "test",
      projectID: "project",
      directory: "/tmp",
      parentID,
      title: "Child session",
      version: "test",
      time: { created: 0, updated: 0 },
    }) as any

  test("rejects unrelated session ids", () => {
    expect(
      isResumableTaskSession({
        session: session("other-parent"),
        parentSessionID: "current-parent",
        requestedAgent: "proxy-tester-idor",
        configuredAgent: "proxy-tester-idor",
      }),
    ).toBe(false)
  })

  test("rejects sibling specialist sessions", () => {
    expect(
      isResumableTaskSession({
        session: session("current-parent"),
        parentSessionID: "current-parent",
        requestedAgent: "proxy-tester-idor",
        configuredAgent: "proxy-tester-idor",
        owner: "proxy-tester-authz",
      }),
    ).toBe(false)
  })

  test("accepts same-parent task owned by requested agent", () => {
    expect(
      isResumableTaskSession({
        session: session("current-parent"),
        parentSessionID: "current-parent",
        requestedAgent: "proxy-tester-idor",
        configuredAgent: "proxy-tester-idor",
        owner: "proxy-tester-idor",
      }),
    ).toBe(true)
  })

  test("accepts the configured agent name when the registry key was aliased", () => {
    expect(
      isResumableTaskSession({
        session: session("current-parent"),
        parentSessionID: "current-parent",
        requestedAgent: "proxy-tester-idor",
        configuredAgent: "idor-specialist",
        owner: "idor-specialist",
      }),
    ).toBe(true)
  })
})
