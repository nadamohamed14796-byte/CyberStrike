import { describe, expect, test } from "bun:test"
import * as fs from "fs/promises"
import path from "path"
import * as ScopeGate from "../../src/tool/scope-gate"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

const scope = ["in_scope:", "  - *.example.com", "out_of_scope:", "  - status.example.com", ""].join("\n")

describe("scope gate for active requests", () => {
  test("in-scope host passes, out-of-scope and unknown hosts are refused", async () => {
    const fixture = await tmpdir()
    await fs.mkdir(path.join(fixture.path, ".cyberstrike"), { recursive: true })
    await Bun.write(path.join(fixture.path, ".cyberstrike", "scope.md"), scope)
    await Instance.provide({
      directory: fixture.path,
      fn: async () => {
        expect(await ScopeGate.refusal("api.example.com")).toBeUndefined()
        expect(await ScopeGate.refusal("status.example.com")).toContain("verdict is out")
        expect(await ScopeGate.refusal("other.org")).toContain("verdict is unknown")
      },
    })
  })

  test("with no scope file every active request is blocked", async () => {
    const fixture = await tmpdir()
    await Instance.provide({
      directory: fixture.path,
      fn: async () => {
        expect(await ScopeGate.refusal("anything.example.com")).toContain("MISSION BLOCKED")
      },
    })
  })
})
