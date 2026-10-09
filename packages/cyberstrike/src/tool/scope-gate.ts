import path from "path"
import { Instance } from "../project/instance"
import * as Scope from "../learning/scope"

// Enforces .cyberstrike/scope.md for active requests. Without any in_scope
// entries the scope cannot be determined, so every active request is refused
// (MISSION BLOCKED), as the spec requires.
export async function refusal(host: string, urlPath = "/") {
  const { inScope, outOfScope } = await Scope.load(path.join(Instance.directory, ".cyberstrike", "scope.md"))
  if (inScope.length === 0)
    return `MISSION BLOCKED: no in_scope entries found in .cyberstrike/scope.md. Scope cannot be determined, so "${host}" is not tested.`
  const result = Scope.verdict(inScope, outOfScope, host, urlPath)
  if (result === "in") return undefined
  return `Refusing host "${host}": scope verdict is ${result}. Only hosts that match in_scope and no out_of_scope entry in .cyberstrike/scope.md may be tested.`
}
