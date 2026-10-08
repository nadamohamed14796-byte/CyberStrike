#!/usr/bin/env bun

interface PR {
  number: number
  title: string
  author: { login: string }
  labels: Array<{ name: string }>
}

interface CommandResult {
  code: number
  stdout: string
  stderr: string
}

async function run(command: string, args: string[] = []): Promise<CommandResult> {
  const process = Bun.spawn([command, ...args], { stdout: "pipe", stderr: "pipe" })
  const stdout = await new Response(process.stdout).text()
  const stderr = await new Response(process.stderr).text()
  const code = await process.exited
  return { code, stdout, stderr }
}

async function main() {
  const list = await run("gh", ["pr", "list", "--state", "open", "--label", "beta", "--json", "number,title,author,labels", "--limit", "100"])
  if (list.code !== 0) throw new Error("gh pr list failed: " + list.stderr.trim())

  const prs: PR[] = JSON.parse(list.stdout).sort((a: PR, b: PR) => a.number - b.number)
  console.log("Found " + prs.length + " open PRs with beta label")
  if (prs.length === 0) return

  const fetchMain = await run("git", ["fetch", "origin", "main"])
  if (fetchMain.code !== 0) throw new Error("git fetch origin main failed: " + fetchMain.stderr.trim())

  const checkout = await run("git", ["checkout", "-B", "beta", "origin/main"])
  if (checkout.code !== 0) throw new Error("git checkout beta failed: " + checkout.stderr.trim())

  const failed: Array<{ number: number; title: string; reason: string }> = []
  for (const pr of prs) {
    const ref = "pr/" + pr.number
    const fetchPR = await run("git", ["fetch", "origin", "pull/" + pr.number + "/head:" + ref])
    if (fetchPR.code !== 0) {
      failed.push({ number: pr.number, title: pr.title, reason: fetchPR.stderr.trim() || "failed to fetch PR head" })
      continue
    }

    const merge = await run("git", ["merge", "--no-edit", ref])
    if (merge.code !== 0) {
      await run("git", ["merge", "--abort"])
      failed.push({ number: pr.number, title: pr.title, reason: merge.stderr.trim() || "merge conflict" })
      continue
    }
    console.log("Merged PR #" + pr.number)
  }

  for (const item of failed) {
    const body = "Blocking Beta Release\n\nPR #" + item.number + " cannot be merged into beta: " + item.reason
    await run("gh", ["pr", "comment", String(item.number), "--body", body])
    console.log("PR #" + item.number + " blocked: " + item.reason)
  }

  const push = await run("git", ["push", "origin", "HEAD:beta", "--force-with-lease"])
  if (push.code !== 0) throw new Error("git push beta failed: " + push.stderr.trim())
  console.log("Beta branch updated successfully")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
