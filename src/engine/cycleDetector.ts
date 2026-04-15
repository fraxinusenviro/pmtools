import type { Dependency, Task } from '@/types'

export class CycleDetectedError extends Error {
  constructor(public cycle: string[]) {
    super(`Circular dependency detected: ${cycle.join(' → ')}`)
    this.name = 'CycleDetectedError'
  }
}

/**
 * Topological sort using Kahn's algorithm.
 * Returns tasks in topological order, or throws CycleDetectedError.
 */
export function topologicalSort(
  tasks: Task[],
  dependencies: Dependency[]
): Task[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]))
  const inDegree = new Map<string, number>()
  const adjList = new Map<string, string[]>()

  for (const t of tasks) {
    inDegree.set(t.id, 0)
    adjList.set(t.id, [])
  }

  for (const dep of dependencies) {
    if (!taskMap.has(dep.predecessorId) || !taskMap.has(dep.successorId)) continue
    adjList.get(dep.predecessorId)!.push(dep.successorId)
    inDegree.set(dep.successorId, (inDegree.get(dep.successorId) ?? 0) + 1)
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const sorted: Task[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    const task = taskMap.get(id)
    if (task) sorted.push(task)
    for (const successorId of (adjList.get(id) ?? [])) {
      const newDeg = (inDegree.get(successorId) ?? 0) - 1
      inDegree.set(successorId, newDeg)
      if (newDeg === 0) queue.push(successorId)
    }
  }

  if (sorted.length !== tasks.length) {
    // Find the cycle nodes for a useful error message
    const inSorted = new Set(sorted.map(t => t.id))
    const cycleNodes = tasks.filter(t => !inSorted.has(t.id)).map(t => t.id)
    throw new CycleDetectedError(cycleNodes)
  }

  return sorted
}

/**
 * Validates that adding a new dependency would not create a cycle.
 * Returns true if safe, false if it would create a cycle.
 */
export function wouldCreateCycle(
  tasks: Task[],
  dependencies: Dependency[],
  newDep: { predecessorId: string; successorId: string }
): boolean {
  const testDeps: Dependency[] = [
    ...dependencies,
    { id: '__test__', projectId: '', type: 'FS', lagDays: 0, ...newDep },
  ]
  try {
    topologicalSort(tasks, testDeps)
    return false
  } catch {
    return true
  }
}
