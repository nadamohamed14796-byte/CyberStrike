import { describe, expect, test } from "bun:test"
import { LearningEngine } from "../src/learning-engine"
import { SignalEngine } from "../src/signals"
import { routeSkills } from "../src/skill-router"
import { FalsePositiveIntelligence } from "../src/false-positive-intelligence"

describe("learned skill routing", () => {
  test("moves the historically useful skill ahead of a noisier skill", () => {
    const engine=new SignalEngine()
    engine.emit({signal:"idor",source:"traffic",confidence:.95,target:"example.com"})

    const learning=new LearningEngine()
    for(let i=0;i<3;i++){
      learning.record({target:"example.com",signal:"idor",skill:"strong-idor",strategy:"identifier",outcome:"confirmed",confidence:.9})
      learning.record({target:"example.com",signal:"idor",skill:"noisy-idor",strategy:"identifier",outcome:"false_positive",confidence:.9})
    }

    const falsePositives=new FalsePositiveIntelligence()
    falsePositives.record({
      target:"example.com",signal:"idor",skill:"noisy-idor",strategy:"identifier",
      reason:"repeated false positive",confidence:.9,
    })

    const result=routeSkills(engine,[
      {name:"noisy-idor",confidence_threshold:.7,required_signals:["idor"],priority:10},
      {name:"strong-idor",confidence_threshold:.7,required_signals:["idor"],priority:1},
    ],"example.com",learning,falsePositives)

    expect(result.skills[0]?.name).toBe("strong-idor")
    expect(result.learned?.[0]?.skill).toBe("strong-idor")
    expect(result.reason).toContain("bounded learning")
  })
})
