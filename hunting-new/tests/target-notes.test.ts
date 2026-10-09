import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { rememberTargetIntelligence } from "../src/target-intelligence"
import { renderTargetNotes } from "../src/target-notes"
import { targetDir } from "../src/store"

describe("target knowledge notes", () => {
  test("renders cross-session endpoints, JS functions, and safe header metadata", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cyberstrike-target-notes-"))
    try {
      await rememberTargetIntelligence(root, "example.test", {
        requests: [{
          id: "req-1",
          sessionId: "session-a",
          method: "GET",
          url: "https://api.example.test/api/profile",
          host: "api.example.test",
          path: "/api/profile",
          credentialId: "cred-a",
          accountLabel: "user-a",
          headerNames: ["Authorization", "Cookie", "Accept"],
          cookieNames: ["session_id"],
          observedAt: 10,
          source: "observed",
        }, {
          id: "req-2",
          sessionId: "session-b",
          method: "GET",
          url: "https://api.example.test/api/profile",
          host: "api.example.test",
          path: "/api/profile",
          credentialId: "cred-b",
          accountLabel: "user-b",
          headerNames: ["Accept", "X-Request-ID"],
          cookieNames: ["session_id"],
          observedAt: 12,
          source: "observed",
        }],
        responses: [{
          id: "resp-1",
          requestId: "req-1",
          status: 200,
          headers: { "content-type": "application/json", "cache-control": "no-store" },
          contentType: "application/json",
          observedAt: 11,
        }],
        jsAssets: [{
          id: "js-1",
          url: "https://api.example.test/assets/app.js",
          pageUrl: "https://example.test/profile",
          observedAt: 8,
        }],
        functions: [{
          id: "fn-1",
          name: "loadProfile",
          assetId: "js-1",
          sourceLocation: "app.js:120",
        }],
        edges: [{
          from: "fn-1",
          to: "req-1",
          kind: "calls",
          confidence: 0.9,
          evidence: "js",
        }],
        parameters: [{
          id: "param-1",
          name: "userId",
          location: "query",
          endpoint: "/api/profile",
          requestIds: ["req-1"],
          sources: ["observed"],
          confidence: 0.95,
          firstSeen: 10,
          lastSeen: 10,
        }],
      })

      const notes = await renderTargetNotes(root, "example.test")
      expect(notes).toContain("api.example.test")
      expect(notes).toContain("- Captured observations: 2")
      expect(notes.split("#### GET /api/profile").length - 1).toBe(1)
      expect(notes).toContain("loadProfile")
      expect(notes).toContain("Authorization, Cookie, Accept")
      expect(notes).toContain("session_id")
      expect(notes).toContain("userId")
      expect(notes).toContain("Response header names: content-type, cache-control")
      const file = Bun.file(path.join(targetDir(root, "example.test"), "target-notes.md"))
      expect(await file.exists()).toBe(true)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
