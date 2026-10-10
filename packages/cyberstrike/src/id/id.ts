import z from "zod"
import { randomBytes } from "crypto"

export namespace Identifier {
  const prefixes = {
    session: "ses",
    message: "msg",
    permission: "per",
    question: "que",
    user: "usr",
    part: "prt",
    pty: "pty",
    tool: "tool",
    vulnerability: "vul",
    request: "req",
    request_observation: "rob",
    coverage_note: "cov",
    web_credential: "wcr",
    web_role: "wrl",
    web_object: "wob",
    web_object_value: "wov",
    web_function: "wfn",
    web_retest: "wrt",
    endpoint_template: "ept",
    intel_entry: "int",
    vrt_check: "vrc",
    methodology_phase: "mph",
    chain_candidate: "chn",
    agent_performance: "apf",
    validation_violation: "vvl",
    skill_learning: "slr",
    skill_learning_event: "sle",
    learning_signal: "lsn",
    target_memory: "tmem",
    tool_artifact: "tart",
    tool_run: "trun",
    false_positive: "fpm",
    mission_claim: "mcl",
    signal_queue: "sigq",
    tool_learning: "tlyn",
    tool_learning_event: "tle",
    report_knowledge: "rkn",
    report_knowledge_event: "rke",
  } as const

  export function schema(prefix: keyof typeof prefixes) {
    return z.string().startsWith(prefixes[prefix])
  }

  const LENGTH = 26

  // State for monotonic ID generation
  let lastTimestamp = 0
  let counter = 0

  export function ascending(prefix: keyof typeof prefixes, given?: string) {
    return generateID(prefix, false, given)
  }

  export function descending(prefix: keyof typeof prefixes, given?: string) {
    return generateID(prefix, true, given)
  }

  function generateID(prefix: keyof typeof prefixes, descending: boolean, given?: string): string {
    if (!given) {
      return create(prefix, descending)
    }

    if (!given.startsWith(prefixes[prefix])) {
      throw new Error(`ID ${given} does not start with ${prefixes[prefix]}`)
    }
    return given
  }

  function randomBase62(length: number): string {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    const limit = 256 - (256 % chars.length)
    let result = ""
    while (result.length < length) {
      const bytes = randomBytes(length - result.length)
      for (const b of bytes) {
        if (b < limit) result += chars[b % chars.length]
        if (result.length === length) break
      }
    }
    return result
  }

  const COUNTER_LENGTH = 3
  const COUNTER_MAX = 62 ** COUNTER_LENGTH - 1
  const MAX_TIMESTAMP = (BigInt(1) << BigInt(48)) - BigInt(1)
  const COUNTER_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

  function encodeCounter(value: number): string {
    if (!Number.isInteger(value) || value < 0 || value > COUNTER_MAX) {
      throw new Error("ID counter exhausted for one timestamp")
    }
    let remaining = value
    let result = ""
    for (let i = 0; i < COUNTER_LENGTH; i++) {
      result = COUNTER_CHARS[remaining % 62] + result
      remaining = Math.floor(remaining / 62)
    }
    return result
  }

  export function create(prefix: keyof typeof prefixes, descending: boolean, timestamp?: number): string {
    const currentTimestamp = timestamp ?? Date.now()
    if (!Number.isSafeInteger(currentTimestamp) || currentTimestamp < 0 || BigInt(currentTimestamp) > MAX_TIMESTAMP) {
      throw new Error("ID timestamp must be a non-negative safe integer within the 48-bit millisecond range")
    }

    if (currentTimestamp !== lastTimestamp) {
      lastTimestamp = currentTimestamp
      counter = 0
    }
    counter++

    const sequence = descending ? COUNTER_MAX - (counter - 1) : counter - 1
    const sortableTimestamp = descending ? MAX_TIMESTAMP - BigInt(currentTimestamp) : BigInt(currentTimestamp)
    const timeBytes = Buffer.alloc(6)
    for (let i = 0; i < 6; i++) {
      timeBytes[i] = Number((sortableTimestamp >> BigInt(40 - 8 * i)) & BigInt(0xff))
    }

    // Keep the 26-character ID payload and type prefix stable. The '~' marker
    // distinguishes new raw-millisecond timestamps from legacy payloads whose
    // first 12 hex characters encoded (timestamp_ms * 4096 + counter) modulo
    // 48 bits. Three ordered Base62 characters preserve same-ms ordering.
    return prefixes[prefix] + "_" + timeBytes.toString("hex") + "~" + encodeCounter(sequence) + randomBase62(LENGTH - 12 - 1 - COUNTER_LENGTH)
  }

  /**
   * Extract the timestamp from an ascending ID. Descending IDs are not supported.
   * Legacy IDs have no '~' marker and had a 48-bit packed timestamp that wrapped;
   * their original Unix timestamp cannot always be reconstructed, but parsing
   * remains compatible and does not accidentally consume random suffix characters.
   */
  export function timestamp(id: string): number {
    const prefix = id.split("_")[0]
    const start = prefix.length + 1
    const isCurrentFormat = id[start + 12] === "~"
    const hex = id.slice(start, start + 12)
    const encoded = BigInt("0x" + hex)
    return isCurrentFormat ? Number(encoded) : Number(encoded / BigInt(0x1000))
  }
}
