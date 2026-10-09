// Finding lifecycle (spec sections 36-39). A finding moves forward one step at
// a time. It can leave the path for a side state at any active step. Nothing
// reaches VERIFIED without passing the ten-question gate.

export const ACTIVE = [
  "DISCOVERED",
  "CANDIDATE",
  "TRIAGED",
  "VALIDATING",
  "VERIFIED",
  "DEDUPED",
  "SEVERITY_ASSESSED",
  "REPORT_READY",
  "SUBMITTED",
] as const

export const SIDE = ["FALSE_POSITIVE", "DUPLICATE", "OUT_OF_SCOPE", "NOT_REPRODUCIBLE", "INCONCLUSIVE"] as const

export type Active = (typeof ACTIVE)[number]
export type Side = (typeof SIDE)[number]
export type State = Active | Side

const order = new Map(ACTIVE.map((state, index) => [state, index] as const))

export function isSide(state: State): state is Side {
  return (SIDE as readonly string[]).includes(state)
}

// Returns the new state, or a reason the move is refused.
export function advance(from: State, to: State, gate?: boolean): { ok: true; state: State } | { ok: false; reason: string } {
  if (isSide(from)) return { ok: false, reason: `${from} is terminal` }
  if (isSide(to)) return { ok: true, state: to }
  const a = order.get(from)!
  const b = order.get(to)!
  if (b !== a + 1) return { ok: false, reason: `${from} cannot move to ${to}; the next step is ${ACTIVE[a + 1] ?? "none"}` }
  if (to === "VERIFIED" && gate !== true) return { ok: false, reason: "VERIFIED requires a passing validation gate" }
  return { ok: true, state: to }
}

// Ten questions from spec section 37. Answers 1-9 must be yes. Answer 10
// asks "is it a duplicate or expected behavior?", so it must be no.
// Missing answers count as failures.
export function gate(answers: boolean[]) {
  const failed = Array.from({ length: 10 }, (_, index) => {
    const answer = answers[index]
    if (answer === undefined) return index + 1
    if (index === 9) return answer ? index + 1 : 0
    return answer ? 0 : index + 1
  }).filter((n) => n !== 0)
  if (failed.length === 0) return { pass: true as const, state: "VERIFIED" as const }
  return { pass: false as const, state: "INCONCLUSIVE" as const, failed }
}

// Dedupe key (spec section 39). Built from root-cause fields, never from the
// URL alone, so /api/users/1, /2 and /3 with the same flaw share one key.
export type Shape = {
  target: string
  functionality: string
  root: string
  method: string
  parameter: string
  cls: string
  behavior: string
}

export function fingerprint(shape: Shape) {
  const parts = [shape.target, shape.functionality, shape.root, shape.method, shape.parameter, shape.cls, shape.behavior].map((part) =>
    part.trim().toLowerCase().replace(/\s+/g, " "),
  )
  return Bun.hash(parts.join("|")).toString(16)
}
