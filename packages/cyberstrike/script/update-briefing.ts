// Rebuild agent-briefing.md from a local folder of write-ups.
// Usage: bun run script/update-briefing.ts <writeups-dir> <output-file>
import path from "path"
import { update } from "../src/learning"

const [dir, out] = process.argv.slice(2)
if (!dir || !out) {
  console.error("usage: update-briefing.ts <writeups-dir> <output-file>")
  process.exit(1)
}

const { index, briefing } = await update(path.resolve(dir))
await Bun.write(path.resolve(out), briefing)
console.log(`read ${index.count} write-ups, wrote ${path.resolve(out)}`)
