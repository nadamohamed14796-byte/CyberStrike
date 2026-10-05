import { describe, expect, test } from "bun:test"
import { FalsePositiveIntelligence } from "../src/false-positive-intelligence"
import { dedupeDecision, shouldRecheckAfterNewEvidence } from "../src/dedupe-engine"

describe("finding dedupe intelligence", () => {
  test("skips known false positives until new evidence appears", () => {
    const intelligence=new FalsePositiveIntelligence()
    const context={target:"example.com",signal:"idor",skill:"api-noauth-hunt",strategy:"identifier",endpoint:"/api/item",accountMode:"attacker"}
    intelligence.record({...context,reason:"rejected during validation",confidence:.9,evidenceIds:["ev-1"]})

    expect(dedupeDecision(intelligence,context).action).toBe("skip")
    expect(shouldRecheckAfterNewEvidence(intelligence,{...context,evidenceIds:["ev-1"]})).toBe(false)
    expect(shouldRecheckAfterNewEvidence(intelligence,{...context,evidenceIds:["ev-2"]})).toBe(true)
  })
})
