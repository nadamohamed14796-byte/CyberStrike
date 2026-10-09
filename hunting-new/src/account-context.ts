export interface AccountContext {
  id: string
  label: string
  authenticationState: "anonymous" | "authenticated"
  credentialFingerprint?: string
  createdAt: number
}

export class AccountContextRegistry {
  private readonly contexts = new Map<string, AccountContext>()

  register(input: Omit<AccountContext, "createdAt">): AccountContext {
    const value = { ...input, createdAt: Date.now() }
    this.contexts.set(input.id, value)
    return value
  }

  get(id: string): AccountContext | undefined {
    return this.contexts.get(id)
  }

  labels(): string[] {
    return [...this.contexts.values()].map(x => x.label)
  }
}
