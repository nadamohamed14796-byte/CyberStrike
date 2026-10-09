import { AttemptLedger, type Attempt, type AttemptPolicy, type AttemptState, type StrategyClass } from "./adaptive-attempts"
import { appendAttempt, loadAttempts } from "./attempt-store"
import { checkpointPhase } from "./runtime-persistence"
import { loadPolicies } from "./policy"

export class PersistentAttemptLedger {
  readonly ledger: AttemptLedger
  private readonly root: string
  private readonly target: string

  private constructor(root:string,target:string,ledger:AttemptLedger){
    this.root=root
    this.target=target
    this.ledger=ledger
  }

  static async create(root:string,target:string,policy:Partial<AttemptPolicy>={}):Promise<PersistentAttemptLedger>{
    const stored=await loadAttempts(root,target)
    const ledger=new AttemptLedger(policy)
    for(const attempt of stored.attempts) ledger.hydrate(attempt)
    return new PersistentAttemptLedger(root,target,ledger)
  }

  async plan(hypothesisId:string,strategy:StrategyClass,variant:string,reason:string):Promise<Attempt|undefined>{
    const policies=await loadPolicies(this.root)
    if(policies.validation.require_reason_for_attempt && !reason.trim()) throw new Error("ATTEMPT_BLOCKED: a non-empty reason is required by policy")
    const attempt=this.ledger.plan(hypothesisId,strategy,variant,reason)
    if(!attempt) return undefined
    await appendAttempt(this.root,this.target,attempt)
    await checkpointPhase(this.root,this.target,"validation:planned")
    return attempt
  }

  async record(id:string,update:Partial<Pick<Attempt,"state"|"requestId"|"responseId"|"resultSummary">> & {evidenceIds?:string[]}):Promise<Attempt>{
    const attempt=this.ledger.record(id,update)
    await appendAttempt(this.root,this.target,attempt)
    await checkpointPhase(this.root,this.target,"validation:recorded")
    return attempt
  }

  list(hypothesisId:string):Attempt[]{ return this.ledger.list(hypothesisId) }
  remaining(hypothesisId:string):number{ return this.ledger.remaining(hypothesisId) }
  state(hypothesisId:string):AttemptState[]{ return this.ledger.list(hypothesisId).map(x=>x.state) }
}
