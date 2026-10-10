import path from "node:path"
import { ensureDir, readJson, targetDir, writeJson, withTargetMutationLock } from "./store"
import type { EvidenceRecord } from "./evidence"
import { createEvidence, mergeEvidence } from "./evidence"
import { loadTargetIntelligence } from "./target-intelligence"

export interface EvidenceState {
  target: string
  evidence: EvidenceRecord[]
  updatedAt: string
}

export async function loadEvidence(root: string, target: string): Promise<EvidenceState> {
  const file = path.join(targetDir(root, target), "intelligence", "evidence.json")
  return (await readJson<EvidenceState | null>(file, null)) ?? { target, evidence: [], updatedAt: new Date().toISOString() }
}

export async function saveEvidence(root: string, state: EvidenceState): Promise<EvidenceState> {
  const dir = path.join(targetDir(root, state.target), "intelligence")
  await ensureDir(dir)
  const next = { ...state, evidence: mergeEvidence(state.evidence), updatedAt: new Date().toISOString() }
  await writeJson(path.join(dir, "evidence.json"), next)
  return next
}

export async function appendEvidence(root: string, target: string, evidence: EvidenceRecord): Promise<EvidenceState> {
  return withTargetMutationLock(root, target, async () => {
    const state = await loadEvidence(root, target)
    return saveEvidence(root, { ...state, evidence: [...state.evidence, evidence] })
  })
}


export async function ensureAttemptEvidence(
  root: string,
  target: string,
  input: {
    attemptId: string
    requestId?: string
    responseId?: string
    accountLabel?: string
  },
): Promise<string[]> {
  return withTargetMutationLock(root, target, async () => {
    const intelligence = await loadTargetIntelligence(root, target)
    const state = await loadEvidence(root, target)
    const existing = new Map(state.evidence.map(item => [item.id, item]))
    const additions = []
    const response = input.responseId
      ? intelligence.responses.find(item => item.id === input.responseId)
      : undefined
    if (input.responseId && !response) throw new Error("EVIDENCE_RESPONSE_NOT_FOUND: " + input.responseId)

    const request = input.requestId
      ? intelligence.requests.find(item => item.id === input.requestId)
      : response
        ? intelligence.requests.find(item => item.id === response.requestId)
        : undefined
    if (input.requestId && !request) throw new Error("EVIDENCE_REQUEST_NOT_FOUND: " + input.requestId)
    if (response && request && response.requestId !== request.id) {
      throw new Error("EVIDENCE_CORRELATION_MISMATCH: response does not belong to request")
    }
    if (response && !request) {
      throw new Error("EVIDENCE_RESPONSE_REQUEST_NOT_FOUND: " + response.requestId)
    }
    if (request && input.accountLabel) {
      const observedAccount = request.accountLabel ?? request.credentialId
      if (!observedAccount || observedAccount !== input.accountLabel) {
        throw new Error("EVIDENCE_CORRELATION_MISMATCH: request does not belong to account")
      }
    }
    const correlatedResponse = response ?? (request
      ? intelligence.responses
        .filter(item => item.requestId === request.id)
        .sort((a, b) => b.observedAt - a.observedAt)[0]
      : undefined)
  
    if (request) {
      additions.push(createEvidence({
        kind: "request",
        sourceId: request.id,
        requestId: request.id,
        attemptId: input.attemptId,
        accountLabel: input.accountLabel ?? request.accountLabel ?? request.credentialId,
        confidence: 1,
        details: request.method + " " + request.url,
      }))
    }
  
    if (correlatedResponse) {
      additions.push(createEvidence({
        kind: "response",
        sourceId: correlatedResponse.id,
        requestId: correlatedResponse.requestId,
        responseId: correlatedResponse.id,
        attemptId: input.attemptId,
        accountLabel: input.accountLabel ?? request?.accountLabel ?? request?.credentialId,
        confidence: 1,
        details: "HTTP " + correlatedResponse.status + (correlatedResponse.contentType ? " " + correlatedResponse.contentType : "") + (correlatedResponse.bodyHash ? " body_hash=" + correlatedResponse.bodyHash : ""),
      }))
    }
  
    if (request) {
      const related = intelligence.edges.filter(edge => edge.from === request.id || edge.to === request.id)
      const functionIds = new Set<string>(related.filter(edge => edge.kind === "triggered-by").map(edge => edge.from))
      const jsAssetIds = new Set<string>(related.filter(edge => edge.kind === "observed-on").map(edge => edge.from))
      for (const functionId of functionIds) {
        const fn = intelligence.functions.find(item => item.id === functionId)
        if (!fn) continue
        additions.push(createEvidence({
          kind: "function",
          sourceId: fn.id,
          requestId: request.id,
          functionId: fn.id,
          attemptId: input.attemptId,
          confidence: 0.9,
          details: fn.name + (fn.sourceLocation ? " @ " + fn.sourceLocation : ""),
        }))
      }
      for (const jsAssetId of jsAssetIds) {
        const asset = intelligence.jsAssets.find(item => item.id === jsAssetId)
        if (!asset) continue
        additions.push(createEvidence({
          kind: "js-asset",
          sourceId: asset.id,
          requestId: request.id,
          jsAssetId: asset.id,
          attemptId: input.attemptId,
          confidence: 0.9,
          details: asset.url,
        }))
      }
    }
  
    const unique = additions.filter(item => !existing.has(item.id))
    if (unique.length) await saveEvidence(root, { ...state, evidence: [...state.evidence, ...unique] })
    return additions.map(item => item.id)
  })
}
