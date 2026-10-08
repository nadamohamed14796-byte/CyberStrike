import z from "zod"
import { Tool } from "./tool"

import { EXTERNAL_TOOLS } from "./external-tool-registry"

const TOOL_INSTALL_MAP = Object.fromEntries(
  EXTERNAL_TOOLS.map((spec) => [
    spec.id,
    {
      check: spec.check,
      install: spec.install ?? "",
      description: spec.phase,
      version: spec.version,
    },
  ]),
) as Record<string, { check: string; install: string; description: string; version?: string[] }>

export const EnsureToolsTool = Tool.define("ensure_tools", {
  description:
    "Check if required security tools are installed and install missing ones. ONLY call this when the user has explicitly requested a pentest, vulnerability scan, or active security testing. NEVER call this for passive questions, code review, tech stack inquiries, or informational requests.",
  parameters: z.object({
    tools: z
      .array(z.string())
      .describe(`Tools to check/install. Available: ${Object.keys(TOOL_INSTALL_MAP).join(", ")}`),
  }),
  async execute(params) {
    const results: Array<{ tool: string; installed: boolean; action: string }> = []

    for (const name of params.tools) {
      const spec = TOOL_INSTALL_MAP[name]
      if (!spec) {
        results.push({ tool: name, installed: false, action: `Unknown tool: ${name}` })
        continue
      }

      // Check if installed
      const check = Bun.spawnSync(["which", spec.check])
      if (check.exitCode === 0) {
        const versionCommand = spec.version ?? [spec.check, "--version"]
        const version = Bun.spawnSync(versionCommand, { timeout: 10_000 })
        const versionText = (version.stdout.toString() || version.stderr.toString())
          .trim()
          .split("\\n")[0]
          .slice(0, 160)
        results.push({
          tool: name,
          installed: true,
          action: `Already installed: ${check.stdout.toString().trim()}${versionText ? ` | version: ${versionText}` : ""}`,
        })
        continue
      }

      // Try to install
      const install = Bun.spawnSync(["sh", "-c", spec.install], { timeout: 120_000 })
      if (install.exitCode === 0) {
        results.push({ tool: name, installed: true, action: `Installed successfully` })
      } else {
        const stderr = install.stderr.toString().trim().slice(0, 200)
        results.push({ tool: name, installed: false, action: `Install failed: ${stderr}` })
      }
    }

    const installed = results.filter((r) => r.installed).length
    const failed = results.filter((r) => !r.installed).length

    const output = [
      `Tool check: ${installed} ready, ${failed} failed`,
      "",
      ...results.map((r) => `${r.installed ? "[OK]" : "[FAIL]"} ${r.tool}: ${r.action}`),
    ]

    return {
      title: `Tools: ${installed}/${results.length} ready`,
      output: output.join("\n"),
      metadata: { installed, failed, results },
    }
  },
})
