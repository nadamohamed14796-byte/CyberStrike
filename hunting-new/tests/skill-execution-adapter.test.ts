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

describe("configured skill agents", () => {
  test("uses the skill-configured agent after explicit overrides are absent", () => {
    const result = buildSkillExecutionInvocation({
      taskId: "task-3", target: "example.test", role: "primary-hunter", primarySkill: "authorization",
      recommendedAgent: "web-application", resolvedSkills: ["authorization"], strategyHints: [],
      signal: "object_identifier_detected", signalConfidence: 0.9, reason: "configured skill agent",
    })
    expect(result.agent).toBe("web-application")
  })

  test("explicit role mapping still beats configured skill agent", () => {
    const result = buildSkillExecutionInvocation({
      taskId: "task-4", target: "example.test", role: "primary-hunter", primarySkill: "authorization",
      recommendedAgent: "configured-agent", resolvedSkills: ["authorization"], strategyHints: [],
      signal: "object_identifier_detected", signalConfidence: 0.9, reason: "override precedence",
    }, { agentByRole: { "primary-hunter": "role-agent" } })
    expect(result.agent).toBe("configured-agent")
  })
})


describe("reference context", () => {
  test("passes indexed reference ids and URLs to the execution prompt", () => {
    const result=buildSkillExecutionInvocation({
      taskId:"task-ref",target:"example.test",role:"primary-hunter",primarySkill:"idor",
      resolvedSkills:["idor"],strategyHints:[],signal:"object_identifier_detected",
      signalConfidence:.9,reason:"reference-aware validation",
      referenceIds:["ref-1"],referenceUrls:["https://portswigger.net/web-security/access-control"],
    })
    expect(result.prompt).toContain("reference_ids: ref-1")
    expect(result.prompt).toContain("reference_urls: https://portswigger.net/web-security/access-control")
  })

  test("passes exact parameter, request, response, and asset correlation to the executing agent", () => {
    const result = buildSkillExecutionInvocation({
      taskId: "task-correlated",
      target: "example.test",
      role: "validator",
      primarySkill: "authorization",
      resolvedSkills: ["authorization"],
      strategyHints: ["account-context"],
      signal: "parameter_discovered",
      signalConfidence: 0.92,
      endpoint: "/api/invoices",
      requestId: "request-a",
      requestUrl: "https://example.test/api/invoices?invoice_id=42",
      requestMethod: "GET",
      responseId: "response-a",
      responseStatus: 200,
      parameterId: "parameter-invoice-id",
      parameterName: "invoice_id",
      parameterLocation: "query",
      accountLabel: "account-a",
      relatedAccountLabels: ["account-b"],
      jsAssetIds: ["asset-a"],
      jsAssetUrls: ["https://example.test/assets/app.js"],
      functionIds: ["function-a"],
      reason: "validate object-level access",
    })

    expect(result.requestId).toBe("request-a")
    expect(result.responseId).toBe("response-a")
    expect(result.parameterId).toBe("parameter-invoice-id")
    expect(result.jsAssetIds).toEqual(["asset-a"])
    expect(result.prompt).toContain("request_url: https://example.test/api/invoices?invoice_id=42")
    expect(result.prompt).toContain("response_status: 200")
    expect(result.prompt).toContain("parameter_name: invoice_id")
    expect(result.prompt).toContain("account_label: account-a")
    expect(result.prompt).toContain("related_account_labels: account-b")
    expect(result.relatedAccountLabels).toEqual(["account-b"])
    expect(result.prompt).toContain("js_asset_urls: https://example.test/assets/app.js")
    expect(result.prompt).toContain("function_ids: function-a")
  })
})
