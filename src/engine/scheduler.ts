/**
 * CPM Scheduling Engine
 *
 * Performs forward pass (early start/finish) and backward pass (late start/finish)
 * to compute float and identify the critical path.
 *
 * MVP: Only Finish-to-Start (FS) dependencies are scheduled.
 * Other types are stored but treated as FS.
 */

import { addDays, max as dateMax, min as dateMin } from 'date-fns'
import type { Dependency, ScheduledTask, Task } from '@/types'
import { topologicalSort } from './cycleDetector'
import { fromISODate, toISODate, calcFinishDate, nextWorkingDay } from '@/utils/dateUtils'

export interface ScheduleInput {
  tasks: Task[]
  dependencies: Dependency[]
  projectStart: string
  projectEnd?: string
  workingDays?: number[]
  holidays?: string[]
}

export function computeSchedule(input: ScheduleInput): Record<string, ScheduledTask> {
  const {
    tasks,
    dependencies,
    projectStart,
    projectEnd,
    workingDays = [1,2,3,4,5],
    holidays = [],
  } = input

  if (tasks.length === 0) return {}

  // Only schedule leaf tasks and milestones (not summary tasks whose dates roll from children)
  // For the CPM we treat every task individually; summary task dates are set from children after.
  const taskMap = new Map(tasks.map(t => [t.id, t]))
  const projectStartDate = nextWorkingDay(fromISODate(projectStart), workingDays, holidays)

  // Topological sort (throws on cycle)
  const sortedTasks = topologicalSort(tasks, dependencies)

  // Build successor and predecessor maps (FS only for MVP)
  const predecessors = new Map<string, Array<{ taskId: string; lag: number }>>()
  const successors = new Map<string, Array<{ taskId: string; lag: number }>>()
  for (const t of tasks) {
    predecessors.set(t.id, [])
    successors.set(t.id, [])
  }
  for (const dep of dependencies) {
    if (!taskMap.has(dep.predecessorId) || !taskMap.has(dep.successorId)) continue
    predecessors.get(dep.successorId)!.push({ taskId: dep.predecessorId, lag: dep.lagDays })
    successors.get(dep.predecessorId)!.push({ taskId: dep.successorId, lag: dep.lagDays })
  }

  const earlyStart = new Map<string, Date>()
  const earlyFinish = new Map<string, Date>()

  // ── Forward Pass ────────────────────────────────────────────────────────────
  for (const task of sortedTasks) {
    const preds = predecessors.get(task.id) ?? []
    let es: Date

    if (task.schedulingMode === 'manual' && task.plannedStart) {
      es = fromISODate(task.plannedStart)
    } else if (preds.length === 0) {
      es = projectStartDate
    } else {
      const predFinishes = preds.map(p => {
        const pf = earlyFinish.get(p.taskId)
        if (!pf) return projectStartDate
        return addDays(pf, p.lag)
      })
      // Latest finish of all predecessors + 1 working day
      const latest = predFinishes.reduce((a, b) => (b > a ? b : a))
      es = nextWorkingDay(addDays(latest, 1), workingDays, holidays)
    }

    // Apply constraint
    if (task.constraintType === 'SNET' && task.constraintDate) {
      const constraint = fromISODate(task.constraintDate)
      if (constraint > es) es = nextWorkingDay(constraint, workingDays, holidays)
    }

    const ef = calcFinishDate(es, task.plannedDuration, workingDays, holidays)
    earlyStart.set(task.id, es)
    earlyFinish.set(task.id, ef)
  }

  // Determine project end: use explicit end if given, else max earlyFinish
  let projectEndDate: Date
  if (projectEnd) {
    projectEndDate = fromISODate(projectEnd)
  } else {
    const allFinishes = [...earlyFinish.values()]
    projectEndDate = allFinishes.length > 0 ? allFinishes.reduce((a, b) => (b > a ? b : a)) : projectStartDate
  }

  const lateStart = new Map<string, Date>()
  const lateFinish = new Map<string, Date>()

  // ── Backward Pass ───────────────────────────────────────────────────────────
  for (const task of [...sortedTasks].reverse()) {
    const succs = successors.get(task.id) ?? []
    let lf: Date

    if (succs.length === 0) {
      lf = projectEndDate
    } else {
      const succStarts = succs.map(s => {
        const sls = lateStart.get(s.taskId)
        if (!sls) return projectEndDate
        return addDays(sls, -s.lag)
      })
      // Earliest late-start of all successors - 1 day
      const earliest = succStarts.reduce((a, b) => (b < a ? b : a))
      lf = addDays(earliest, -1)
      // Walk back to a working day
      while (!([1,2,3,4,5].includes(lf.getDay())) || holidays.includes(toISODate(lf))) {
        lf = addDays(lf, -1)
      }
    }

    const ls = addDays(lf, -(task.plannedDuration - 1))
    // Ensure ls is a working day (walk backward)
    let lsAdj = new Date(ls)
    while (lsAdj > lf && !([1,2,3,4,5].includes(lsAdj.getDay()))) {
      lsAdj = addDays(lsAdj, -1)
    }

    lateFinish.set(task.id, lf)
    lateStart.set(task.id, lsAdj)
  }

  // ── Compute Float & Critical Path ───────────────────────────────────────────
  const result: Record<string, ScheduledTask> = {}

  for (const task of sortedTasks) {
    const es = earlyStart.get(task.id)!
    const ef = earlyFinish.get(task.id)!
    const ls = lateStart.get(task.id)!
    const lf = lateFinish.get(task.id)!

    // Float in calendar days (simplified; working-day float is more complex)
    const totalFloat = Math.round((ls.getTime() - es.getTime()) / (1000 * 60 * 60 * 24))

    // Free float: earliest successor earlyStart - this earlyFinish - 1
    const succs = successors.get(task.id) ?? []
    let freeFloat = totalFloat
    if (succs.length > 0) {
      const minSuccES = succs
        .map(s => earlyStart.get(s.taskId))
        .filter(Boolean)
        .reduce((a, b) => (b! < a! ? b : a)) as Date
      const ff = Math.round((minSuccES.getTime() - ef.getTime()) / (1000 * 60 * 60 * 24)) - 1
      freeFloat = Math.max(0, ff)
    }

    result[task.id] = {
      taskId: task.id,
      earlyStart: toISODate(es),
      earlyFinish: toISODate(ef),
      lateStart: toISODate(ls),
      lateFinish: toISODate(lf),
      totalFloat: Math.max(0, totalFloat),
      freeFloat: Math.max(0, freeFloat),
      isCritical: totalFloat <= 0,
      computedDuration: task.plannedDuration,
    }
  }

  return result
}
