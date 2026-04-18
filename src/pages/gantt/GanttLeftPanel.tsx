import React, { useRef, useEffect } from 'react'
import { GANTT_HEADER_HEIGHT } from '@/utils/constants'
import type { Task, ScheduledTask } from '@/types'
import type { ColumnId } from './types'
import { COLUMN_LABELS, COLUMN_WIDTHS } from './types'
import { format, parseISO } from 'date-fns'

// ─── Props ────────────────────────────────────────────────────────────────────

interface GanttLeftPanelProps {
  orderedIds: string[]
  tasks: Record<string, Task>
  schedule: Record<string, ScheduledTask>
  selectedTaskId: string | null
  onSelect: (taskId: string) => void
  rowHeight: number
  visibleColumns: ColumnId[]
  editingTaskId: string | null
  onEditStart: (taskId: string) => void
  onEditCommit: (taskId: string, name: string) => void
  onEditCancel: () => void
  scrollTop: number
}

// ─── Column widths helper ─────────────────────────────────────────────────────

function totalExtraWidth(cols: ColumnId[]): number {
  return cols.reduce((sum, c) => sum + COLUMN_WIDTHS[c] + 4, 0)
}

// ─── Cell renderers ───────────────────────────────────────────────────────────

function renderCell(col: ColumnId, task: Task, schedule: ScheduledTask | undefined): string {
  switch (col) {
    case 'wbs':
      return task.wbsNumber ?? ''
    case 'duration':
      return task.isMilestone ? '0d' : `${task.plannedDuration}d`
    case 'start':
      return schedule ? format(parseISO(schedule.earlyStart), 'MM/dd') : ''
    case 'finish':
      return schedule ? format(parseISO(schedule.earlyFinish), 'MM/dd') : ''
    case 'percent':
      return `${task.percentComplete}%`
    default:
      return ''
  }
}

// ─── Inline edit input ────────────────────────────────────────────────────────

function EditInput({ task, onCommit, onCancel }: {
  task: Task
  onCommit: (name: string) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.select() }, [])

  return (
    <input
      ref={ref}
      defaultValue={task.name}
      className="flex-1 min-w-0 text-xs border border-blue-400 rounded px-1 py-0 outline-none bg-white"
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); onCommit(ref.current?.value ?? task.name) }
        if (e.key === 'Escape') onCancel()
        e.stopPropagation()
      }}
      onBlur={() => onCommit(ref.current?.value ?? task.name)}
      onClick={e => e.stopPropagation()}
    />
  )
}

// ─── GanttLeftPanel ───────────────────────────────────────────────────────────

export function GanttLeftPanel({
  orderedIds, tasks, schedule, selectedTaskId, onSelect,
  rowHeight, visibleColumns, editingTaskId, onEditStart, onEditCommit, onEditCancel,
  scrollTop,
}: GanttLeftPanelProps) {
  const HDR_H = GANTT_HEADER_HEIGHT
  const nameMinWidth = 140
  const extraW = totalExtraWidth(visibleColumns)
  const totalWidth = nameMinWidth + extraW + 16 // 16 for scrollbar buffer

  return (
    <div
      className="flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden"
      style={{ width: totalWidth }}
    >
      {/* Header */}
      <div
        className="flex items-center bg-slate-50 border-b border-slate-200 flex-shrink-0 text-xs font-medium text-slate-500 uppercase tracking-wide"
        style={{ height: HDR_H }}
      >
        <div className="flex-1 px-3 truncate">Task Name</div>
        {visibleColumns.map(col => (
          <div key={col} className="text-center flex-shrink-0 px-1" style={{ width: COLUMN_WIDTHS[col] }}>
            {COLUMN_LABELS[col]}
          </div>
        ))}
      </div>

      {/* Task rows — positioned absolutely relative to scroll */}
      <div className="flex-1 overflow-hidden relative">
        <div
          style={{ transform: `translateY(-${scrollTop}px)` }}
        >
          {orderedIds.map((tid, i) => {
            const task = tasks[tid]
            if (!task) return null
            const sched = schedule[tid]
            const indent = (task.wbsNumber?.split('.').length ?? 1) - 1
            const isSelected = selectedTaskId === tid
            const isEditing = editingTaskId === tid
            const isCritical = sched?.isCritical

            return (
              <div
                key={tid}
                className={`flex items-center border-b border-slate-100 cursor-pointer select-none ${
                  isSelected ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                } hover:bg-blue-50`}
                style={{ height: rowHeight, paddingLeft: 4 + indent * 14 }}
                onClick={() => !isEditing && onSelect(tid)}
              >
                {/* Task name cell */}
                <div className="flex items-center flex-1 min-w-0 gap-1 pr-1">
                  {task.isMilestone && <span className="text-purple-500 flex-shrink-0 text-[10px]">◆</span>}
                  {isEditing ? (
                    <EditInput
                      task={task}
                      onCommit={name => onEditCommit(tid, name)}
                      onCancel={onEditCancel}
                    />
                  ) : (
                    <span
                      className={`truncate text-xs leading-tight ${
                        task.isSummary ? 'font-semibold text-slate-800' : 'text-slate-700'
                      } ${isCritical ? 'text-red-600' : ''}`}
                      onDoubleClick={e => { e.stopPropagation(); onEditStart(tid) }}
                      title={task.name}
                    >
                      {task.name}
                    </span>
                  )}
                </div>

                {/* Extra columns */}
                {visibleColumns.map(col => (
                  <div
                    key={col}
                    className="text-center flex-shrink-0 text-xs text-slate-500 px-1 tabular-nums"
                    style={{ width: COLUMN_WIDTHS[col] }}
                  >
                    {renderCell(col, task, sched)}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
