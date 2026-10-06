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