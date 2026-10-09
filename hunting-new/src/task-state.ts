export type TaskState = "pending" | "claimed" | "running" | "completed" | "failed" | "blocked"

export interface TaskStateRecord {
  taskId: string
  state: TaskState
  attempts: number
  updatedAt: string
}
