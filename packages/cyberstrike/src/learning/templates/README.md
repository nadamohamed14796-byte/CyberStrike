# Your notes for the learning pipeline

Put these in a folder you control (for example `D:/hunting/notes`):

- `findings/*.md`: one file per finding. Lines `status:` (accepted | fp | duplicate) and `class:` (for example idor, ssrf, xss) are read. The first `# heading` is the title.
- `fp.md`: one bullet per false positive you do not want reported again.

Run: `bun run script/sync-briefing.ts <project-dir> <notes-dir>`
