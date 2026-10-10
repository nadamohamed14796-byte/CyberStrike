import { describe, expect, test } from "bun:test"
import { Identifier } from "../../src/id/id"

describe("sortable identifiers", () => {
  test("round-trips modern Unix millisecond timestamps without overflow", () => {
    const timestamp = 1_760_000_000_000
    const id = Identifier.create("session", false, timestamp)
    expect(Identifier.timestamp(id)).toBe(timestamp)
    expect(id.length).toBe(30)
    expect(id[16]).toBe("~")
  })

  test("legacy identifiers remain parseable even when suffix characters are not hexadecimal", () => {
    const encodedTime = "123456789abc"
    const legacyID = "ses_" + encodedTime + "zz000000000000"
    expect(legacyID.length).toBe(30)
    expect(Identifier.timestamp(legacyID)).toBe(Number(BigInt("0x" + encodedTime) / BigInt(0x1000)))
  })

  test("same-millisecond ascending identifiers sort by creation sequence", () => {
    const timestamp = 1_760_000_000_123
    const first = Identifier.create("session", false, timestamp)
    const second = Identifier.create("session", false, timestamp)
    expect(first < second).toBe(true)
  })

  test("descending identifiers reverse the timestamp sort order", () => {
    const older = Identifier.create("session", true, 1_760_000_001_000)
    const newer = Identifier.create("session", true, 1_760_000_002_000)
    expect(newer < older).toBe(true)
  })
})
