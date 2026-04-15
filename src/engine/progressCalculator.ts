import type { Task } from '@/types'

/**
 * Compute the rolled-up % complete for a summary task.
 * Uses duration-weighted average of children.
 */
export function calcRollupPercent(taskId: string, tasks: Record<string, Task>): number {
  const task = tasks[taskId]
  if (!task) return 0
  if (!task.isSummary || task.childIds.length === 0) {
    return task.percentComplete
  }

  let totalWeight = 0
  let weightedComplete = 0

  for (const childId of task.childIds) {
    const child = tasks[childId]
    if (!child) continue
    const childPct = calcRollupPercent(childId, tasks)
    const weight = Math.max(child.plannedDuration, 1)
    totalWeight += weight
    weightedComplete += weight * childPct
  }

  if (totalWeight === 0) return 0
  return Math.round(weightedComplete / totalWeight)
}

/**
 * Compute project-level % complete from root tasks.
 */
export function calcProjectPercent(tasks: Record<string, Task>, projectId: string): number {
  const rootTasks = Object.values(tasks).filter(
    t => t.projectId === projectId && t.parentId === null
  )

  let totalWeight = 0
  let weightedComplete = 0

  for (const root of rootTasks) {
    const pct = calcRollupPercent(root.id, tasks)
    const weight = Math.max(root.plannedDuration, 1)
    totalWeight += weight
    weightedComplete += weight * pct
  }

  if (totalWeight === 0) return 0
  return Math.round(weightedComplete / totalWeight)
}
