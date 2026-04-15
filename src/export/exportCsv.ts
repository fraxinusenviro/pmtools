import type { Task } from '@/types'
import { getOrderedTaskIds } from '@/utils/wbsUtils'

export function exportTasksCsv(tasks: Record<string, Task>, projectId: string): void {
  const ids = getOrderedTaskIds(tasks, projectId)
  const rows = ids.map(id => {
    const t = tasks[id]
    if (!t) return null
    return {
      WBS: t.wbsNumber || '',
      Name: t.name,
      Type: t.isMilestone ? 'Milestone' : t.isSummary ? 'Summary' : 'Task',
      Start: t.plannedStart,
      Finish: t.plannedEnd,
      Duration: t.plannedDuration,
      'Complete%': t.percentComplete,
      Status: t.status,
      Budget: t.budgetAmount,
      Actual: t.actualCost,
    }
  }).filter(Boolean) as Record<string, unknown>[]

  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
  ]
  downloadText(lines.join('\n'), 'tasks.csv', 'text/csv')
}

export function downloadText(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
