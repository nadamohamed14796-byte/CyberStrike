import { describe, expect, test } from "bun:test"
import { dispatchAgentTasks, type AgentTask, type MultiAgentPlan } from "../src/multi-agent-planner"

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
})
