import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { loadTargetIntelligence, rememberTargetIntelligence } from "../src/target-intelligence"

describe("target intelligence persistence", () => {
  test("merges intelligence across sessions", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cyberstrike-"))
    try {
      await rememberTargetIntelligence(root, "example.test", {
        tags: ["js"],
        requests: [{ id: "req-1", sessionId: "s1", method: "GET", url: "https://example.test/api/users", observedAt: 1, source: "observed" }],
      })
      await rememberTargetIntelligence(root, "example.test", {
        tags: ["api"],
        requests: [{ id: "req-2", sessionId: "s2", method: "POST", url: "https://example.test/api/users", observedAt: 2, source: "observed" }],
      })
      const state = await loadTargetIntelligence(root, "example.test")
      expect(state.requests).toHaveLength(2)
      expect(state.tags).toEqual(["js", "api"])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})


import { discoverRequestParameters } from "../src/target-intelligence"

describe("request parameter discovery", () => {
  test("discovers query, path-template, and JSON body parameters", () => {
    const request={
      id:"req-params",
      sessionId:"s1",
      method:"POST",
      url:"https://example.test/api/users/{id}?include=profile",
      path:"/api/users/{id}",
      rawRequest:"POST /api/users/123 HTTP/1.1\nHost: example.test\nContent-Type: application/json\n\n{\"role\":\"user\"}",
      observedAt:1,
      source:"observed" as const,
    } as any
    const names=discoverRequestParameters(request).map(x=>x.name)
    expect(names).toContain("include")
    expect(names).toContain("id")
    expect(names).toContain("role")
  })
})
