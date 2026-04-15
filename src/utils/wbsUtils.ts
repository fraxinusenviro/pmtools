import type { Task } from '@/types'

/**
 * Compute WBS numbers for all tasks in a project.
 * Returns a map of taskId → wbsNumber string (e.g. "1.2.3")
 */
export function computeWbsNumbers(
  tasks: Record<string, Task>,
  projectId: string
): Record<string, string> {
  const result: Record<string, string> = {}

  // Get root tasks (parentId === null) for this project, sorted
  const rootTasks = Object.values(tasks)
    .filter(t => t.projectId === projectId && t.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  function walk(taskIds: string[], prefix: string) {
    let idx = 1
    for (const id of taskIds) {
      const task = tasks[id]
      if (!task) continue
      const wbs = prefix ? `${prefix}.${idx}` : `${idx}`
      result[id] = wbs
      const children = (task.childIds || [])
        .map(cid => tasks[cid])
        .filter(Boolean)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(c => c.id)
      if (children.length > 0) {
        walk(children, wbs)
      }
      idx++
    }
  }

  walk(rootTasks.map(t => t.id), '')
  return result
}

/**
 * Returns an ordered flat list of all task IDs in WBS order (depth-first).
 */
export function getOrderedTaskIds(tasks: Record<string, Task>, projectId: string): string[] {
  const result: string[] = []

  const rootTasks = Object.values(tasks)
    .filter(t => t.projectId === projectId && t.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  function walk(ids: string[]) {
    for (const id of ids) {
      const task = tasks[id]
      if (!task) continue
      result.push(id)
      const children = (task.childIds || [])
        .map(cid => tasks[cid])
        .filter(Boolean)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(c => c.id)
      walk(children)
    }
  }

  walk(rootTasks.map(t => t.id))
  return result
}
