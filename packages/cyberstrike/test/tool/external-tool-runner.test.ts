import { describe, expect, test } from "bun:test"
import { buildArgv } from "../../src/tool/external-tool-runner"

describe("ExternalToolRunner", () => {
  test("renders registered commands as argv without shell evaluation", () => {
    const argv = buildArgv("httpx -silent -u <target>", {
      target: "https://example.com/?q=$(touch /tmp/pwned);echo-owned",
    })
    expect(argv).toEqual(["httpx", "-silent", "-u", "https://example.com/?q=$(touch /tmp/pwned);echo-owned"])
  })

  test("requires values for command placeholders", () => {
    expect(() =>
      buildArgv("ffuf -u <target>/FUZZ -w <wordlist>", {
        target: "https://example.com",
        parameters: {},
      }),
    ).toThrow("Missing parameter <wordlist>")
  })

  test("supports explicit extra argv entries", () => {
    expect(
      buildArgv("nuclei -u <target>", {
        target: "https://example.com",
        parameters: { extra_args: ["-severity", "high"] },
      }),
    ).toEqual(["nuclei", "-u", "https://example.com", "-severity", "high"])
  })
})
