import { Database } from "../../src/storage/db"
import { ProjectTable } from "../../src/project/project.sql"
import { SessionTable } from "../../src/session/session.sql"

/**
 * Create lightweight project/session rows needed by learning tests because
 * learning tables correctly enforce their session foreign keys.
 */
export function createLearningTestSessions(prefix: string, names: string[]) {
  const projectID = "learning-test-project-" + prefix
  const now = Date.now()
  Database.transaction((db) => {
    db.insert(ProjectTable)
      .values({
        id: projectID,
        worktree: process.cwd(),
        name: "Learning test " + prefix,
        sandboxes: [],
        time_created: now,
        time_updated: now,
      })
      .onConflictDoNothing()
      .run()

    for (const name of names) {
      const id = "learning-test-session-" + prefix + "-" + name
      db.insert(SessionTable)
        .values({
          id,
          project_id: projectID,
          slug: id,
          directory: process.cwd(),
          title: "Learning test session " + name,
          version: "test",
          time_created: now,
          time_updated: now,
        })
        .onConflictDoNothing()
        .run()
    }
  })
  return Object.fromEntries(names.map((name) => [name, "learning-test-session-" + prefix + "-" + name])) as Record<
    string,
    string
  >
}
