import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Diamond } from 'lucide-react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns'
import type { Task } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-slate-100 text-slate-700 border-slate-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  on_hold: 'bg-amber-100 text-amber-800 border-amber-200',
}

export function CalendarPage() {
  const { id } = useParams<{ id: string }>()
  const tasks = useStore(s => s.tasks)
  const [currentDate, setCurrentDate] = useState(new Date())

  const projectTasks = Object.values(tasks).filter(t => t.projectId === id)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const getTasksForDay = (day: Date): Task[] => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return projectTasks.filter(t => t.plannedEnd === dayStr)
  }

  const prev = () => setCurrentDate(d => subMonths(d, 1))
  const next = () => setCurrentDate(d => addMonths(d, 1))

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prev}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={next}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {weekDays.map(d => (
            <div
              key={d}
              className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayTasks = getTasksForDay(day)
            const inMonth = isSameMonth(day, currentDate)
            const today = isToday(day)
            const isWeekend = day.getDay() === 0 || day.getDay() === 6

            return (
              <div
                key={i}
                className={`min-h-[100px] p-2 border-b border-r border-slate-100 ${
                  !inMonth ? 'bg-slate-50' : isWeekend ? 'bg-slate-50/50' : 'bg-white'
                }`}
              >
                <div className="flex justify-end mb-1">
                  <span
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      today
                        ? 'bg-blue-600 text-white'
                        : inMonth
                        ? 'text-slate-700'
                        : 'text-slate-300'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map(t => (
                    <div
                      key={t.id}
                      title={`${t.name} — ${t.status.replace('_', ' ')}`}
                      className={`text-xs px-1.5 py-0.5 rounded border truncate flex items-center gap-1 ${
                        STATUS_COLORS[t.status] || STATUS_COLORS.not_started
                      }`}
                    >
                      {t.isMilestone && <Diamond size={8} className="flex-shrink-0 fill-current" />}
                      <span className="truncate">{t.name}</span>
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-slate-400 px-1">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
        <span className="font-medium">Legend:</span>
        {Object.entries(STATUS_COLORS).map(([status, cls]) => (
          <span key={status} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${cls}`}>
            {status.replace('_', ' ')}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <Diamond size={10} className="fill-current text-slate-600" /> Milestone
        </span>
      </div>
    </div>
  )
}
