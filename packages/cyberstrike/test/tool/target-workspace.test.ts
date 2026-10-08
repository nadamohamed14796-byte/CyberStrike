import { describe, expect, test } from "bun:test"
import crypto from "node:crypto"
import { TargetWorkspace } from "../../src/tool/target-workspace"

describe("TargetWorkspace", () => {
  test("creates deterministic isolated target/session paths", () => {
    const a = TargetWorkspace.paths("https://Example.com/", "session_a")
    const b = TargetWorkspace.paths("https://example.com", "session_a")
    const c = TargetWorkspace.paths("https://example.com", "session_b")
    expect(a.root).toBe(b.root)
    expect(a.session).toBe(b.session)
    expect(a.session).not.toBe(c.session)
    expect(a.recon.startsWith(a.session)).toBe(true)
    expect(a.lessons.startsWith(a.root)).toBe(true)
    expect(a.lessonsFile).toBe(`${a.lessons}/lessons.ndjson`)
  })

  test("persists and reloads target-specific lessons", async () => {
    const target = `https://example.com/lessons-test-${crypto.randomUUID()}.test`
    const lesson = await TargetWorkspace.addLesson(target, {
      kind: "observation",
      summary: "The test target exposes a stable API prefix",
      details: "Recorded during the test session",
      confidence: "high",
      tags: ["api", "persistence"],
    })

    const lessons = await TargetWorkspace.readLessons(target)
    expect(lessons).toHaveLength(1)
    expect(lessons[0]).toMatchObject({
      id: lesson.id,
      kind: "observation",
      summary: "The test target exposes a stable API prefix",
      confidence: "high",
    })
  })

  test("rejects path traversal in session ids", () => {
    expect(() => TargetWorkspace.paths("https://example.com", "../escape")).toThrow()
    expect(() => TargetWorkspace.paths("https://example.com", "a/b")).toThrow()
  })
})
