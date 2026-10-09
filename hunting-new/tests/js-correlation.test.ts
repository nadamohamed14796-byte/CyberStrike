import { describe, expect, test } from "bun:test"
import { describe as d, expect as e, test as t } from "bun:test"
import { createGraph } from "../src/correlation"
import { correlateJSRequests } from "../src/js-correlation"

describe("javascript correlation", () => {
  test("links JS-derived request knowledge to an asset", () => {
    const graph = createGraph()
    correlateJSRequests(graph, {
      asset: { js_asset_id: "asset-1", url: "https://example.test/app.js", content_hash: "hash", size: 10, source_map_available: false, first_seen: "", last_seen: "" },
      requests: [{ method: "GET", endpoint: "/api/users", parameters: [], headers: [], body: {}, confidence: .8 }],
      observedRequestIds: [],
    })
    expect(graph.assets.has("asset-1")).toBe(true)
    expect(graph.edges.some(x => x.kind === "references")).toBe(true)
  })
})
