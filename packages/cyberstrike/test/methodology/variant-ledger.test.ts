import { describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { VariantLedger } from "../../src/methodology/variant-ledger"
import { TargetWorkspace } from "../../src/tool/target-workspace"

describe("VariantLedger", () => {
  test("records and reads variants in the isolated session state", async () => {
    const target = "https://example.com"
    const session = "variant-test-session"
    await VariantLedger.record(target, session, { endpoint: "/api/users/1", variant: "role=admin", result: "denied" })
    const rows = await VariantLedger.list(target, session)
    expect(rows.some((x) => x.variant === "role=admin")).toBe(true)
    const workspace = TargetWorkspace.paths(target, session)
    await fs.rm(workspace.root, { recursive: true, force: true })
  })
})