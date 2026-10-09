import { expect, test } from "bun:test"
import { matchesSourceURLFingerprint, sourceFingerprints } from "../../src/learning/source-fingerprint"

test("normalizes URL scheme and host while stripping fragments", () => {
  const first = sourceFingerprints("HTTPS://Research.Example/CaseSensitive/Report?id=AbC#section")
  const second = sourceFingerprints("https://research.example/CaseSensitive/Report?id=AbC#other")

  expect(first[0]).toBe("url:v2:https://research.example/CaseSensitive/Report?id=AbC")
  expect(second[0]).toBe(first[0])
})

test("does not merge URLs whose case-sensitive path or query values differ", () => {
  const upperPath = sourceFingerprints("https://research.example/IDOR?object=AbC")[0]
  const lowerPath = sourceFingerprints("https://research.example/idor?object=AbC")[0]
  const differentQuery = sourceFingerprints("https://research.example/IDOR?object=abc")[0]

  expect(upperPath).not.toBe(lowerPath)
  expect(upperPath).not.toBe(differentQuery)
})

test("keeps the legacy lowercase key for compatibility with existing records", () => {
  const keys = sourceFingerprints("https://research.example/CaseSensitive?id=AbC")

  expect(keys).toContain("url:https://research.example/casesensitive?id=abc")
})

test("legacy lookup reuses only the same original case-sensitive URL", () => {
  const requested = sourceFingerprints("https://research.example/CaseSensitive?id=AbC")[0]

  expect(matchesSourceURLFingerprint("https://research.example/CaseSensitive?id=AbC", requested)).toBe(true)
  expect(matchesSourceURLFingerprint("https://research.example/casesensitive?id=abc", requested)).toBe(false)
})
