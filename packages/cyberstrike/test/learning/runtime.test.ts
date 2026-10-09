import { describe, expect, test } from "bun:test"
import * as fs from "fs/promises"
import path from "path"
import * as Runtime from "../../src/learning/runtime"
import { tmpdir } from "../fixture/fixture"

const finding = { id: "f1", title: "IDOR on invoices", cls: "idor", signals: ["object_identifier_detected"], severity: "high" as const }

describe("runtime learning", () => {
  test("an unseen signal scores 5, and accepted outcomes raise its score", () => {
    let store: Runtime.Store = { signals: {}, findings: [] }
    expect(Runtime.score(store, "object_identifier_detected")).toBe(5)
    store = Runtime.addFinding(store, finding)
    store = Runtime.triage(store, "f1", "accepted")
    expect(Runtime.score(store, "object_identifier_detected")).toBeGreaterThan(5)
  })

  test("false positives and duplicates lower a signal's score", () => {
    let store: Runtime.Store = { signals: {}, findings: [] }
    store = Runtime.addFinding(store, finding)
    store = Runtime.triage(store, "f1", "fp")
    expect(Runtime.score(store, "object_identifier_detected")).toBeLessThan(5)
  })

  test("a finding is triaged once and a repeat record keeps the first", () => {
    let store: Runtime.Store = { signals: {}, findings: [] }
    store = Runtime.addFinding(store, finding)
    const again = Runtime.addFinding(store, { ...finding, title: "changed" })
    expect(again).toBe(store)
    store = Runtime.triage(store, "f1", "accepted")
    expect(Runtime.triage(store, "f1", "fp")).toBe(store)
    expect(store.findings[0].status).toBe("accepted")
  })

  test("the summary puts accepted first, then severity, and leaves out fp and duplicates", () => {
    let store: Runtime.Store = { signals: {}, findings: [] }
    store = Runtime.addFinding(store, { ...finding, id: "a", severity: "low" })
    store = Runtime.addFinding(store, { ...finding, id: "b", severity: "critical" })
    store = Runtime.addFinding(store, { ...finding, id: "c", severity: "critical" })
    store = Runtime.addFinding(store, { ...finding, id: "d", severity: "critical" })
    store = Runtime.triage(store, "c", "accepted")
    store = Runtime.triage(store, "d", "fp")
    expect(Runtime.ranked(store).map((f) => f.id)).toEqual(["c", "b", "a"])
  })

  test("the recon plan lists learned signals highest score first", () => {
    let store: Runtime.Store = { signals: {}, findings: [] }
    store = Runtime.addFinding(store, { ...finding, id: "x", signals: ["jwt_detected"] })
    store = Runtime.triage(store, "x", "accepted")
    store = Runtime.addFinding(store, { ...finding, id: "y", signals: ["cors_reflection_detected"] })
    store = Runtime.triage(store, "y", "fp")
    const plan = Runtime.plan(store)
    expect(plan.map((item) => item.signal)).toEqual(["jwt_detected", "cors_reflection_detected"])
    expect(plan[0].score).toBeGreaterThan(plan[1].score)
  })

  test("the store survives a save and load", async () => {
    const fixture = await tmpdir()
    const filepath = path.join(fixture.path, ".cyberstrike", "learning.db")
    await fs.mkdir(path.dirname(filepath), { recursive: true })
    let store: Runtime.Store = { signals: {}, findings: [] }
    store = Runtime.addFinding(store, finding)
    store = Runtime.triage(store, "f1", "accepted")
    await Runtime.save(filepath, store)
    expect(await Runtime.load(filepath)).toEqual(store)
  })
})
