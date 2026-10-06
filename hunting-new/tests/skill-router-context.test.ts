import { describe, expect, test } from "bun:test"
import { SignalEngine } from "../src/signals"
import { SkillRegistry } from "../src/skill-registry"
import { routeRegisteredSkills } from "../src/skill-router"

function registry(){
  return new SkillRegistry([{
    name:"idor-context",
    category:"web",
    description:"idor",
    triggers:["object_identifier_detected"],
    required_signals:["object_identifier_detected"],
    required_context:["authorized-scope","account-context"],
    dependencies:[],
    risk_level:"medium",
    scope_requirements:["authorized-scope"],
    validation_requirements:["cross-account-evidence"],
    confidence_threshold:.7,
    maximum_parallel_tasks:1,
  }])
}

describe("required context routing", () => {
  test("does not route account-context skills without account evidence", () => {
    const engine=new SignalEngine()
    engine.emit({signal:"object_identifier_detected",source:"test",confidence:.9,target:"example.test"})
    expect(routeRegisteredSkills(engine,registry(),"example.test").skills).toHaveLength(0)
  })

  test("routes account-context skills once an authenticated request is observed", () => {
    const engine=new SignalEngine()
    engine.emit({signal:"object_identifier_detected",source:"test",confidence:.9,target:"example.test"})
    engine.emit({signal:"authenticated_endpoint",source:"test",confidence:.9,target:"example.test",metadata:{accountLabel:"attacker"}})
    expect(routeRegisteredSkills(engine,registry(),"example.test").skills).toHaveLength(1)
  })
})
