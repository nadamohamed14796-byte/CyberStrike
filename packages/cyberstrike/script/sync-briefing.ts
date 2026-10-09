// Pull the public write-up sources, rebuild the briefing, and write it to the
// project's .cyberstrike folder where the agent reads it at session start.
// Usage: bun run script/sync-briefing.ts [project-dir] [notes-dir]
// notes-dir holds your own findings/ folder and fp.md (see src/learning/notes.ts).
import path from "path"
import { sync } from "../src/learning/sync"

const project = path.resolve(process.argv[2] ?? process.cwd())
const notes = process.argv[3] ? path.resolve(process.argv[3]) : undefined
const results = await sync(notes)
const briefing = results.map((r) => r.briefing).join("\n")
await Bun.write(path.join(project, ".cyberstrike", "agent-briefing.md"), briefing)
for (const r of results) console.log(`${r.source}: ${r.writeups} write-ups @ ${r.head.slice(0, 8)}`)
