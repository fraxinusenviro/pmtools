import {
  addDays,
  isWeekend,
  parseISO,
  format,
  differenceInCalendarDays,
  isSameDay,
} from 'date-fns'

export function isWorkingDay(date: Date, workingDays: number[] = [1,2,3,4,5], holidays: string[] = []): boolean {
  const dow = date.getDay() // 0=Sun
  if (!workingDays.includes(dow)) return false
  const iso = format(date, 'yyyy-MM-dd')
  if (holidays.includes(iso)) return false
  return true
}

/**
 * Add `n` working days to `start`. n=0 returns start if working, else next working day.
 */
export function addWorkingDays(
  start: Date,
  n: number,
  workingDays: number[] = [1,2,3,4,5],
  holidays: string[] = []
): Date {
  let current = new Date(start)
  let remaining = n
  while (remaining > 0) {
    current = addDays(current, 1)
    if (isWorkingDay(current, workingDays, holidays)) {
      remaining--
    }
  }
  return current
}

/**
 * Returns the finish date for a task starting on `start` with `duration` working days.
 * Duration 0 returns start (milestones). Duration 1 means just that start day.
 */
export function calcFinishDate(
  start: Date,
  duration: number,
  workingDays: number[] = [1,2,3,4,5],
  holidays: string[] = []
): Date {
  if (duration <= 0) return start
  let current = new Date(start)
  let days = 1 // start counts as day 1
  if (!isWorkingDay(current, workingDays, holidays)) {
    // advance to first working day
    while (!isWorkingDay(current, workingDays, holidays)) {
      current = addDays(current, 1)
    }
    days = 1
  }
  while (days < duration) {
    current = addDays(current, 1)
    if (isWorkingDay(current, workingDays, holidays)) {
      days++
    }
  }
  return current
}

/**
 * Next working day on or after `date`.
 */
export function nextWorkingDay(
  date: Date,
  workingDays: number[] = [1,2,3,4,5],
  holidays: string[] = []
): Date {
  let d = new Date(date)
  while (!isWorkingDay(d, workingDays, holidays)) {
    d = addDays(d, 1)
  }
  return d
}

/**
 * Count working days between two dates (inclusive of both endpoints if working).
 */
export function diffWorkingDays(
  start: Date,
  end: Date,
  workingDays: number[] = [1,2,3,4,5],
  holidays: string[] = []
): number {
  const s = start < end ? start : end
  const e = start < end ? end : start
  let count = 0
  let cur = new Date(s)
  while (cur <= e) {
    if (isWorkingDay(cur, workingDays, holidays)) count++
    cur = addDays(cur, 1)
  }
  return count
}

export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function fromISODate(s: string): Date {
  return parseISO(s)
}

export function calendarDaysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(b), parseISO(a))
}
