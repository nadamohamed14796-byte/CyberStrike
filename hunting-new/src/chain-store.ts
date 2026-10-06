import path from "node:path"
import { ensureDir, readJson, targetDir, writeJson, withTargetMutationLock } from "./store"
import type { Chain, ChainStatus } from "./chain-board"

export interface ChainState {
  target: string
  chains: Chain[]
  updatedAt: string
}

export async function loadChains(root: string, target: string): Promise<ChainState> {
  const file = path.join(targetDir(root, target), "intelligence", "chains.json")
  return (await readJson<ChainState | null>(file, null)) ?? {
    target,
    chains: [],
    updatedAt: new Date().toISOString(),
  }
}

export async function saveChains(root: string, state: ChainState): Promise<ChainState> {
  const dir = path.join(targetDir(root, state.target), "intelligence")
  await ensureDir(dir)
  const next = { ...state, updatedAt: new Date().toISOString() }
  await writeJson(path.join(dir, "chains.json"), next)
  return next
}

export async function upsertChain(root: string, target: string, chain: Chain): Promise<ChainState> {
  return withTargetMutationLock(root, target, async () => {
    const state = await loadChains(root, target)
    const index = state.chains.findIndex(x => x.id === chain.id)
    if (index === -1) state.chains.push(chain)
    else state.chains[index] = { ...state.chains[index], ...chain }
    return saveChains(root, state)
  })
}

export async function transitionChain(root: string, target: string, id: string, status: ChainStatus): Promise<Chain> {
  return withTargetMutationLock(root, target, async () => {
    const state = await loadChains(root, target)
    const chain = state.chains.find(x => x.id === id)
    if (!chain) throw new Error("CHAIN_NOT_FOUND")
    chain.status = status
    await saveChains(root, state)
    return chain
  })
}
