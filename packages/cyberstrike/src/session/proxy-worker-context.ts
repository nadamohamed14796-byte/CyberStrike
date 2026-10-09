/** In-memory correlation for the active proxy request being analyzed in a child session. */
const activeRequests = new Map<string, string>()

export namespace ProxyWorkerContext {
  export function set(sessionID: string, requestID: string): void {
    activeRequests.set(sessionID, requestID)
  }

  export function get(sessionID: string): string | undefined {
    return activeRequests.get(sessionID)
  }

  export function clear(sessionID: string, requestID: string): void {
    if (activeRequests.get(sessionID) === requestID) activeRequests.delete(sessionID)
  }
}
