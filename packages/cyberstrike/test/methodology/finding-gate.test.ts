import { describe, expect, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { Vulnerability } from "../../src/session/vulnerability"
import { FindingGate } from "../../src/methodology/finding-gate"

const projectRoot = path.join(__dirname, "../..")
import path from "path"

describe("FindingGate", () => {
  test("blocks a finding that has not passed triage/evidence requirements", async () => {
    await Instance.provide({ directory: projectRoot, fn: async () => {
      const session = await Session.create({})
      const result = Vulnerability.add({ sessionID: session.id, data: {
        severity: "medium", title: "Test finding", description: "Observed behavior that requires validation.",
        endpoint: "https://example.com/api/test", steps_to_reproduce: "Send the request and compare the response.",
        business_impact: "An attacker could access data belonging to another user.", recommendation: "Enforce authorization on the server.",
        poc: "GET /api/test -> HTTP/1.1 200 OK with unauthorized data.",
      }})
      const gate = FindingGate.validate(session.id, result.id!, ["example.com"])
      expect(gate.passed).toBe(false)
      expect(gate.requirements).toHaveLength(10)
      expect(gate.requirements.find((x) => x.id === 9)?.passed).toBe(false)
      await Session.remove(session.id)
    }})
  })
})
