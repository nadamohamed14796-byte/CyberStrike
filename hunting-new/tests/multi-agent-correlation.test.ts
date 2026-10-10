import { describe, expect, test } from "bun:test"
import { buildMultiAgentPlan, dispatchAgentTasks, type AgentTask, type MultiAgentPlan } from "../src/multi-agent-planner"
import { SignalEngine } from "../src/signals"

const task = (id: string, role: AgentTask["role"], accountLabel: string): AgentTask => ({
  id,
  role,
  skill: role === "validator" ? "validate-access" : "check-access",
  signal: "authenticated_endpoint",
  signalConfidence: 0.9,
  target: "app.example",
  endpoint: "/api/profile",
  requestId: "request-" + accountLabel,
  accountLabel,
  parameterId: "user_id",
  priority: 100,
  reason: "test",
  dependencies: role === "validator" ? ["primary-hunter"] : [],
  maxParallelTasks: 1,
  strategyHints: [],
})

describe("multi-agent correlation links", () => {
  test("does not satisfy a validator dependency using another account's completed task", () => {
    const hunterB = task("hunter-b", "primary-hunter", "account-b")
    const validatorA = task("validator-a", "validator", "account-a")
    const plan: MultiAgentPlan = {
      target: "app.example",
      mode: "targeted",
      reason: "test",
      tasks: [hunterB, validatorA],
      lanes: {
        "primary-hunter": [hunterB],
        validator: [validatorA],
        correlator: [],
        reviewer: [],
      },
    }

    const batch = dispatchAgentTasks(plan, new Map([
      ["hunter-b", "completed"],
      ["validator-a", "pending"],
    ]), 4)

    expect(batch.tasks.map(item => item.id)).not.toContain("validator-a")
    expect(batch.dependencyBlocked.map(item => item.id)).toContain("validator-a")
  })

  test("allows a validator after the matching account and request are completed", () => {
    const hunterA = task("hunter-a", "primary-hunter", "account-a")
    const hunterB = task("hunter-b", "primary-hunter", "account-b")
    const validatorA = task("validator-a", "validator", "account-a")
    const plan: MultiAgentPlan = {
      target: "app.example",
      mode: "targeted",
      reason: "test",
      tasks: [hunterA, hunterB, validatorA],
      lanes: {
        "primary-hunter": [hunterA, hunterB],
        validator: [validatorA],
        correlator: [],
        reviewer: [],
      },
    }

    const batch = dispatchAgentTasks(plan, new Map([
      ["hunter-a", "completed"],
      ["hunter-b", "pending"],
      ["validator-a", "pending"],
    ]), 4)

    expect(batch.tasks.map(item => item.id)).toContain("validator-a")
  })

  test("keeps JavaScript asset signals separate in the planner", () => {
    const engine = new SignalEngine()
    engine.emit({
      signal: "source_map_detected",
      source: "correlation:js",
      confidence: 0.9,
      target: "app.example",
      metadata: { jsAssetId: "asset-a", url: "https://app.example/a.js.map" },
    })
    engine.emit({
      signal: "source_map_detected",
      source: "correlation:js",
      confidence: 0.9,
      target: "app.example",
      metadata: { jsAssetId: "asset-b", url: "https://app.example/b.js.map" },
    })

    const plan = buildMultiAgentPlan(engine, [{
      name: "source-map-analysis",
      confidence_threshold: 0.5,
      required_signals: ["source_map_detected"],
    }], "app.example")
    const tasks = plan.tasks.filter(item => item.signal === "source-map-detected")

    expect(tasks).toHaveLength(2)
    expect(tasks.map(item => item.jsAssetId).sort()).toEqual(["asset-a", "asset-b"])
    expect(new Set(tasks.map(item => item.id)).size).toBe(2)
  })

})
