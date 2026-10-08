import type { Session } from "../session"

/** Validate that a task resume token belongs to the current parent and specialist. */
export function isResumableTaskSession(input: {
  session: Session.Info
  parentSessionID: string
  requestedAgent: string
  configuredAgent: string
  owner?: string
}): boolean {
  if (input.session.parentID !== input.parentSessionID) return false
  if (!input.owner) return true
  return input.owner === input.requestedAgent || input.owner === input.configuredAgent
}
