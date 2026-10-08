import { describe, expect, test } from "bun:test"
import { Learning } from "../../src/learning"
import { ToolLearning } from "../../src/learning/tool-learning"

describe("Learning.emit", () => {
  test("does not convert a completed tool run into an error learning signal", async () => {
    const tool = "__regression_completed_tool__"
    const signal = "__regression_completed_signal__"
    const before = ToolLearning.recent(500).filter((row) => row.tool === tool && row.signal === signal)

    await Learning.emit({
      hook: "during_testing",
      signal,
      outcome: "completed",
      metadata: { source_tool: tool },
    })

    const after = ToolLearning.recent(500).filter((row) => row.tool === tool && row.signal === signal)
    expect(after.length).toBe(before.length)
  })
})
