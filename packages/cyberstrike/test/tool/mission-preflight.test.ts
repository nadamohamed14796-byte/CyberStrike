import { describe, expect, test } from "bun:test"
import { ScopeGuard } from "../../src/tool/scope-check"
describe("mission preflight invariants",()=>{
 test("rejects an out-of-scope target before runtime execution",()=>{
  const result=ScopeGuard.check("https://evil.example",["example.com"])
  expect(result.inScope).toBe(false)
 })
})