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
    expect(TargetWorkspace.targetFrom("https://Example.com/api/users")).toBe("https://example.com")
    expect(TargetWorkspace.targetFrom("example.com")).toBe("https://example.com")
  })

  test("deduplicates equivalent lessons and returns bounded recent history", async () => {
    const target = `https://example.com/lesson-dedupe-${crypto.randomUUID()}.test`
    const first = await TargetWorkspace.addLesson(target, {
      kind: "pattern",
      summary: "  Repeated API behavior  ",
      tags: ["API", "pattern"],
    })
    const second = await TargetWorkspace.addLesson(target, {
      kind: "pattern",
      summary: "Repeated API behavior",
      tags: ["pattern", "api"],
    })

    expect(second.id).toBe(first.id)
    expect(await TargetWorkspace.readLessons(target)).toHaveLength(1)

    for (let i = 0; i < 3; i++) {
      await TargetWorkspace.addLesson(target, { kind: "observation", summary: `observation ${i}` })
    }
    expect(await TargetWorkspace.recentLessons(target, 2).then((items) => items.map((x) => x.summary))).toEqual([
      "observation 1",
      "observation 2",
    ])
  })

  test("rejects path traversal in session ids", () => {
    expect(() => TargetWorkspace.paths("https://example.com", "../escape")).toThrow()
    expect(() => TargetWorkspace.paths("https://example.com", "a/b")).toThrow()
  })
})
