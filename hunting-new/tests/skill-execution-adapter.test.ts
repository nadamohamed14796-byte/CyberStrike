import { describe, expect, test } from "bun:test"
import { buildSkillExecutionInvocation } from "../src/skill-execution-adapter"

describe("skill execution routing", () => {
  test("maps correlator tasks to the proxy agent by default", () => {
    const result = buildSkillExecutionInvocation({
      taskId: "task-1", target: "example.test", role: "correlator", primarySkill: "proxy-analyzer",
      resolvedSkills: ["proxy-analyzer"], strategyHints: ["api-surface"], signal: "javascript_function_request_correlation",
      signalConfidence: 0.9, reason: "correlated request",
    })
    expect(result.agent).toBe("proxy-agent")
  })

  test("explicit skill mapping wins over role mapping", () => {
    const result = buildSkillExecutionInvocation({
      taskId: "task-2", target: "example.test", role: "correlator", primarySkill: "proxy-analyzer",
      resolvedSkills: ["proxy-analyzer"], strategyHints: [], signal: "api", signalConfidence: 0.9, reason: "api signal",
    }, { agentBySkill: { "proxy-analyzer": "custom-agent" } })
    expect(result.agent).toBe("custom-agent")
  })
})