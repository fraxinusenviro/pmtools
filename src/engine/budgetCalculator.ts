import type { Task, ActualCostEntry } from '@/types'

export interface BudgetSummary {
  planned: number
  actual: number
  variance: number
  burnPercent: number
  isOverBudget: boolean
  isAtRisk: boolean
}

export function calcBudgetSummary(
  tasks: Record<string, Task>,
  actualCosts: Record<string, ActualCostEntry>,
  projectId: string
): BudgetSummary {
  const projectTasks = Object.values(tasks).filter(t => t.projectId === projectId)
  const projectActuals = Object.values(actualCosts).filter(a => a.projectId === projectId)

  const planned = projectTasks.reduce((sum, t) => sum + (t.budgetAmount || 0), 0)
  const actual = projectActuals.reduce((sum, a) => sum + a.amount, 0)
  const variance = planned - actual
  const burnPercent = planned > 0 ? Math.round((actual / planned) * 100) : 0

  return {
    planned,
    actual,
    variance,
    burnPercent,
    isOverBudget: actual > planned * 1.05,
    isAtRisk: actual > planned * 0.85,
  }
}
