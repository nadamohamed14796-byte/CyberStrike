import { describe, expect, test } from "bun:test"
import { ReconToolchainTool } from "../../src/tool/recon-toolchain"

describe("ReconToolchainTool", () => {
  test("routes live HTTP to httpx", async () => {
    const tool = await ReconToolchainTool.init()
    const result = await tool.execute(
      { signal: "live HTTP", target: "example.com", max_tools: 3, authorized_active_testing: false } as any,
      {} as any,
    )
    expect(result.output).toContain("httpx")
    expect(result.output).toContain("scope_required: true")
  })

  test("blocks high-impact tools without explicit authorization", async () => {
    const tool = await ReconToolchainTool.init()
    const result = await tool.execute(
      { signal: "SQL-like behavior", target: "example.com", max_tools: 3, authorized_active_testing: false } as any,
      {} as any,
    )
    expect(result.output).not.toContain("sqlmap")
  })

  test("allows gated tool selection when explicitly authorized", async () => {
    const tool = await ReconToolchainTool.init()
    const result = await tool.execute(
      { signal: "SQL-like behavior", target: "example.com", max_tools: 3, authorized_active_testing: true } as any,
      {} as any,
    )
    expect(result.output).toContain("sqlmap")
  })
})
