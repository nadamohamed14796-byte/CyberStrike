import fs from "node:fs/promises"
import { TargetWorkspace } from "../tool/target-workspace"

export type VariantRecord = { endpoint: string; parameter?: string; variant: string; account?: string; role?: string; result: string; evidence?: string; confidence?: number; timestamp?: number }
export namespace VariantLedger {
  export async function record(target: string, sessionID: string, input: VariantRecord) {
    const workspace = await TargetWorkspace.ensure(target, sessionID)
    const file = `${workspace.state}/variant-ledger.jsonl`
    const record = { ...input, timestamp: input.timestamp ?? Date.now() }
    await fs.appendFile(file, JSON.stringify(record) + "\n", "utf8")
    return record
  }
  export async function list(target: string, sessionID: string) {
    const workspace = TargetWorkspace.paths(target, sessionID)
    try {
      const raw = await fs.readFile(`${workspace.state}/variant-ledger.jsonl`, "utf8")
      return raw.split("\n").filter(Boolean).flatMap((line) => { try { return [JSON.parse(line) as VariantRecord] } catch { return [] } })
    } catch { return [] }
  }
  export async function has(target: string, sessionID: string, endpoint: string, variant: string, account?: string) {
    const rows = await list(target, sessionID)
    return rows.some((row) => row.endpoint === endpoint && row.variant === variant && row.account === account)
  }
}