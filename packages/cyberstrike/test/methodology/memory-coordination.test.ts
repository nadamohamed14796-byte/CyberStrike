import { describe, expect, test } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { FalsePositive } from "../../src/methodology/false-positive"
import { MissionClaims } from "../../src/methodology/mission-claims"
import { Intel } from "../../src/methodology/intel"

const projectRoot = path.join(__dirname, "../..")

describe("contextual FP memory", () => {
  test("deduplicates the same rejection and increases hit count", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const session = await Session.create({})
        FalsePositive.remember({
          sessionID: session.id,
          vulnClass: "CWE-79",
          endpointPattern: "/search",
          reason: "known safe sanitizer",
        })
        FalsePositive.remember({
          sessionID: session.id,
          vulnClass: "CWE-79",
          endpointPattern: "/search",
          reason: "known safe sanitizer",
          confidence: 0.95,
        })
        const rows = FalsePositive.list(session.id)
        expect(rows.length).toBe(1)
        expect(rows[0].hit_count).toBe(2)
        expect(FalsePositive.matches(session.id, { vulnClass: "CWE-79", endpoint: "/search?q=x" }).length).toBe(1)
        await Session.remove(session.id)
      },
    })
  })
})

describe("mission claims", () => {
  test("only one agent owns an active work cell", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const session = await Session.create({})
        expect(MissionClaims.claim({ sessionID: session.id, cellKey: "api:/users:idor", agent: "A" }).claimed).toBe(true)
        const second = MissionClaims.claim({ sessionID: session.id, cellKey: "api:/users:idor", agent: "B" })
        expect(second.claimed).toBe(false)
        expect(second.owner).toBe("A")
        MissionClaims.release(session.id, "api:/users:idor", "A", "fp1")
        expect(MissionClaims.claim({ sessionID: session.id, cellKey: "api:/users:idor", agent: "B" }).claimed).toBe(true)
        await Session.remove(session.id)
      },
    })
  })
})

describe("canonical parameter ingestion", () => {
  test("all parameter sources converge on Intel type=parameter", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const session = await Session.create({})
        const entry = Intel.addParameter({
          sessionID: session.id,
          endpoint: "https://example.com/search",
          name: "q",
          source: "arjun",
        })
        expect(entry.type).toBe("parameter")
        expect(entry.tags).toContain("parameter-source:arjun")
        await Session.remove(session.id)
      },
    })
  })
})
