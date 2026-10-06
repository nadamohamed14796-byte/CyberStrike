import { describe, expect, test } from "bun:test"
import { signalEngineFromCorrelation } from "../src/signals"

describe("correlation signals", () => {
  test("emits API method mismatch only when JS and observed methods differ", () => {
    const engine = signalEngineFromCorrelation({
      target: "example.test",
      requests: [
        { id: "js-1", url: "https://example.test/api/user", path: "/api/user", method: "GET", observedAt: 1, source: "js" },
        { id: "obs-1", url: "https://example.test/api/user", path: "/api/user", method: "POST", observedAt: 2, source: "observed" },
      ],
      responses: [],
      jsAssets: [],
      functions: [],
      edges: [],
    })
    expect(engine.forTarget("example.test").some(x => x.signal === "api_method_mismatch")).toBe(true)
  })
})

describe("skill selection confidence", () => {
  test("requires every required signal to meet the rule threshold", () => {
    const engine = signalEngineFromCorrelation({
      target: "example.test",
      requests: [],
      responses: [],
      jsAssets: [],
      functions: [],
      edges: [],
    })
    engine.emit({ signal: "object_identifier_detected", source: "test", confidence: 0.95, target: "example.test" })
    engine.emit({ signal: "authenticated_endpoint", source: "test", confidence: 0.40, target: "example.test" })
    const selected = engine.selectSkills([
      {
        name: "id-test",
        confidence_threshold: 0.80,
        required_signals: ["object_identifier_detected", "authenticated_endpoint"],
      },
    ], "example.test")
    expect(selected).toHaveLength(0)
  })
})


describe("API documentation differential signals", () => {
  test("emits endpoint and method drift signals from OpenAPI sources", () => {
    const engine=signalEngineFromCorrelation({
      target:"example.test",
      requests:[
        {id:"js-1",url:"https://example.test/users",method:"GET",path:"/users",observedAt:1,source:"js"},
        {id:"obs-1",url:"https://example.test/admin",method:"POST",path:"/admin",observedAt:2,source:"observed"},
      ],
      responses:[],
      jsAssets:[],
      functions:[],
      apiSources:[
        {endpoint:"https://example.test/users",method:"POST",source:"swagger"},
        {endpoint:"https://example.test/admin",method:"GET",source:"swagger"},
      ],
      edges:[],
    })
    expect(engine.list().some(x=>x.signal==="api_method_mismatch")).toBe(true)
    expect(engine.list().some(x=>x.signal==="endpoint_discovery" && x.endpoint==="https://example.test/admin")).toBe(true)
  })
})
