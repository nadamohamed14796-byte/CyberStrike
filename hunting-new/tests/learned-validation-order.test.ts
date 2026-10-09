import { describe, expect, test } from "bun:test"
import { LearningEngine } from "../src/learning-engine"
import { FalsePositiveIntelligence } from "../src/false-positive-intelligence"
import { rankValidationVariants } from "../src/validation-runner"

describe("learned validation strategy ordering", () => {
  test("promotes confirmed strategies and penalizes repeated false positives", () => {
    const learning=new LearningEngine()
    for(let i=0;i<3;i++){
      learning.record({target:"example.com",signal:"idor",skill:"api",strategy:"identifier",outcome:"confirmed",confidence:.9})
      learning.record({target:"example.com",signal:"idor",skill:"api",strategy:"parameter",outcome:"false_positive",confidence:.9})
    }
    const fp=new FalsePositiveIntelligence()
    fp.record({target:"example.com",signal:"idor",skill:"api",strategy:"parameter",reason:"noise",confidence:.9})

    const result=rankValidationVariants(
      {id:"h",target:"example.com",signal:"idor",title:"IDOR",confidence:.9,status:"testing",evidenceIds:[],createdAt:new Date().toISOString()},
      [
        {strategy:"parameter",variant:"baseline"},
        {strategy:"identifier",variant:"baseline"},
      ],
      learning,fp,"example.com"
    )
    expect(result[0].strategy).toBe("identifier")
  })
})
