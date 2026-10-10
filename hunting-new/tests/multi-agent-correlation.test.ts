import { describe, expect, test } from "bun:test"
import { buildMultiAgentPlan, dispatchAgentTasks, type AgentTask, type MultiAgentPlan } from "../src/multi-agent-planner"
import { SignalEngine } from "../src/signals"
import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { enrichAgentTaskExecutionContext, type AgentTaskExecutionContext } from "../src/multi-agent-runtime"
import { emptyTargetIntelligence, saveTargetIntelligence } from "../src/target-intelligence"

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

  test("does not satisfy a validator dependency using another asset identity", () => {
    const hunterB: AgentTask = {
      ...task("hunter-b", "primary-hunter", "account-b"),
      requestId: undefined,
      accountLabel: undefined,
      parameterId: undefined,
      endpoint: undefined,
      jsAssetId: "asset-b",
    }
    const validatorA: AgentTask = {
      ...task("validator-a", "validator", "account-a"),
      requestId: undefined,
      accountLabel: undefined,
      parameterId: undefined,
      endpoint: undefined,
      jsAssetId: "asset-a",
    }
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


const contextPlan: MultiAgentPlan = {
  target: "app.example",
  mode: "targeted",
  reason: "test",
  tasks: [],
  lanes: { "primary-hunter": [], validator: [], correlator: [], reviewer: [] },
}

function assetContext(jsAssetId: string): AgentTaskExecutionContext {
  return {
    taskId: "task-" + jsAssetId,
    target: "app.example",
    primarySkill: "analyze-js",
    resolvedSkills: ["analyze-js"],
    strategyHints: ["js-correlation"],
    signal: "javascript_asset",
    signalConfidence: 0.9,
    jsAssetIds: [jsAssetId],
    reason: "test",
  }
}

test("resolves a JavaScript asset only through its actual graph correlation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cyberstrike-agent-correlation-"))
  try {
    const state = emptyTargetIntelligence("app.example")
    state.requests = [
      { id: "request-a", sessionId: "session-a", method: "GET", url: "https://app.example/api/a", path: "/api/a", observedAt: 10, source: "observed" },
      { id: "request-b", sessionId: "session-b", method: "GET", url: "https://app.example/api/b", path: "/api/b", observedAt: 20, source: "observed" },
    ]
    state.responses = [
      { id: "response-a", requestId: "request-a", status: 200, headers: {}, observedAt: 11 },
      { id: "response-b", requestId: "request-b", status: 200, headers: {}, observedAt: 21 },
    ]
    state.jsAssets = [
      { id: "asset-linked", url: "https://app.example/a.js", observedAt: 1 },
      { id: "asset-unlinked", url: "https://app.example/b.js", observedAt: 2 },
    ]
    state.edges = [
      { from: "asset-linked", to: "request-a", kind: "observed-on", confidence: 0.95, evidence: "observed" },
    ]
    await saveTargetIntelligence(root, state)

    const linked = await enrichAgentTaskExecutionContext(root, contextPlan, assetContext("asset-linked"))
    expect(linked.requestId).toBe("request-a")
    expect(linked.responseId).toBe("response-a")
    expect(linked.jsAssetIds).toContain("asset-linked")

    const unlinked = await enrichAgentTaskExecutionContext(root, contextPlan, assetContext("asset-unlinked"))
    expect(unlinked.requestId).toBeUndefined()
    expect(unlinked.responseId).toBeUndefined()
    expect(unlinked.jsAssetIds).toContain("asset-unlinked")
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("rejects an explicitly mismatched request and response pair", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cyberstrike-agent-correlation-"))
  try {
    const state = emptyTargetIntelligence("app.example")
    state.requests = [
      { id: "request-a", sessionId: "session-a", method: "GET", url: "https://app.example/a", path: "/a", observedAt: 1, source: "observed" },
      { id: "request-b", sessionId: "session-b", method: "GET", url: "https://app.example/b", path: "/b", observedAt: 2, source: "observed" },
    ]
    state.responses = [
      { id: "response-a", requestId: "request-a", status: 200, headers: {}, observedAt: 3 },
    ]
    await saveTargetIntelligence(root, state)

    await expect(enrichAgentTaskExecutionContext(root, contextPlan, {
      ...assetContext("asset-any"),
      requestId: "request-b",
      responseId: "response-a",
    })).rejects.toThrow("AGENT_CORRELATION_MISMATCH")
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

})
