import z from "zod"
import { Tool } from "./tool"
import { TargetMemory } from "../session/target-memory"

const jsonValue = z.unknown()
export const UnderstandApplicationTool = Tool.define("understand_application", {
  description: "Persist the structured application model produced by the Understand workflow. This is context, not a vulnerability verdict.",
  parameters: z.object({
    purpose: z.string().optional(), authentication: jsonValue.optional(), roles: jsonValue.optional(),
    workflows: jsonValue.optional(), sensitive_objects: jsonValue.optional(), endpoints: jsonValue.optional(),
    trust_boundaries: jsonValue.optional(), technologies: jsonValue.optional(), observations: jsonValue.optional(),
    confidence: z.number().min(0).max(100).default(70), source: z.string().default("understand-agent"),
  }),
  async execute(params, ctx) {
    TargetMemory.rememberApplicationModel(ctx.sessionID, {
      purpose: params.purpose, authentication: params.authentication, roles: params.roles, workflows: params.workflows,
      sensitiveObjects: params.sensitive_objects, endpoints: params.endpoints, trustBoundaries: params.trust_boundaries,
      technologies: params.technologies, observations: params.observations, confidence: params.confidence, source: params.source,
    })
    return { title: "Application model persisted", output: "Structured application understanding persisted to TargetMemory. It must still be validated before being treated as a finding.", metadata: { persisted: true, confidence: params.confidence } }
  },
})