import z from "zod"
import { Tool } from "./tool"
import { route, SIGNALS } from "../skill/route"

// Lets the agent turn observed signals into the skills to load, using the same
// table the Skill Trigger Map in the prompt is checked against.
export const RouteSkillsTool = Tool.define("route_skills", {
  description:
    "Given the signals observed on the target (for example jwt_detected, object_identifier_detected, graphql_detected), return the skills to load. Signals with no mapping return nothing. Load only the skills this returns.",
  parameters: z.object({
    signals: z.array(z.string()).min(1).describe("Signal names observed on the target"),
  }),
  async execute(params) {
    const skills = route(params.signals)
    const unknown = params.signals.filter((signal) => !(signal in SIGNALS))
    const lines = [
      skills.length ? `Load these skills: ${skills.join(", ")}` : "No skill is mapped to these signals.",
      unknown.length ? `No mapping for: ${unknown.join(", ")}` : "",
    ].filter(Boolean)
    return { title: "route_skills", output: lines.join("\n"), metadata: { skills, unknown } }
  },
})
