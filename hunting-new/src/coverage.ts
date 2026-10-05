import { coverageGate } from "./ledger"
export async function missionCoverage(root:string,target:string){const result=await coverageGate(root,target);const rows=Object.entries(result.ledgers).map(([name,value])=>({ledger:name,...value}));return{complete:result.complete,rows,pending:result.pending}}
