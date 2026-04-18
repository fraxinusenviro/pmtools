import React from 'react'
import { GANTT_MIN_BAR_WIDTH } from '@/utils/constants'
import type { Task, ScheduledTask, Resource, Assignment, BaselineTask } from '@/types'
import type { ToolMode, ColorBy } from './types'
import { WBS_PALETTE } from './types'

// ─── Color computation ────────────────────────────────────────────────────────

function getStatusColor(task: Task, isCritical: boolean): string {
  if (isCritical) return '#ef4444'
  if (task.status === 'completed') return '#22c55e'
  if (task.status === 'in_progress') return '#3b82f6'
  if (task.status === 'on_hold') return '#f97316'
  return '#94a3b8'
}

export function getBarColor(
  task: Task,
  scheduled: ScheduledTask,
  colorBy: ColorBy,
  resources: Record<string, Resource>,
): string {
  switch (colorBy) {
    case 'critical':
      return scheduled.isCritical ? '#ef4444' : '#94a3b8'
    case 'wbs': {
      const depth = Math.max(0, (task.wbsNumber?.split('.').length ?? 1) - 1)
      return WBS_PALETTE[Math.min(depth, WBS_PALETTE.length - 1)]
    }
    case 'assignee': {
      const firstId = task.assigneeIds[0]
      return (firstId && resources[firstId]?.color) ? resources[firstId].color! : '#94a3b8'
    }
    case 'status':
    default:
      return getStatusColor(task, scheduled.isCritical)
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

export function dateToX(date: string, viewStart: Date, pxPerDay: number): number {
  const d = new Date(date + 'T00:00:00')
  const days = Math.round((d.getTime() - viewStart.getTime()) / 86400000)
  return days * pxPerDay
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface GanttBarProps {
  task: Task
  scheduled: ScheduledTask
  rowIndex: number
  viewStart: Date
  pxPerDay: number
  rowHeight: number
  colorBy: ColorBy
  showLabel: boolean
  resources: Record<string, Resource>
  baselineTask?: BaselineTask | null
  toolMode: ToolMode
  isSelected: boolean
  onDragStart: (taskId: string, type: 'move' | 'resize-right', startX: number) => void
  onClick: (taskId: string) => void
  onLinkStart: (taskId: string, edge: 'left' | 'right', clientX: number, clientY: number) => void
}

// ─── GanttBar ─────────────────────────────────────────────────────────────────

export function GanttBar({
  task, scheduled, rowIndex, viewStart, pxPerDay, rowHeight,
  colorBy, showLabel, resources, baselineTask,
  toolMode, isSelected,
  onDragStart, onClick, onLinkStart,
}: GanttBarProps) {
  const PADDING = 5
  const y = rowIndex * rowHeight + PADDING
  const barH = task.isMilestone ? 0 : rowHeight - PADDING * 2

  const x = dateToX(scheduled.earlyStart, viewStart, pxPerDay)
  const xEnd = dateToX(scheduled.earlyFinish, viewStart, pxPerDay) + pxPerDay
  const w = Math.max(xEnd - x, GANTT_MIN_BAR_WIDTH)

  const color = getBarColor(task, scheduled, colorBy, resources)
  const cy = rowIndex * rowHeight + rowHeight / 2

  // Baseline ghost bar
  const baselineEl = baselineTask ? (() => {
    const bx = dateToX(baselineTask.plannedStart, viewStart, pxPerDay)
    const bxEnd = dateToX(baselineTask.plannedEnd, viewStart, pxPerDay) + pxPerDay
    const bw = Math.max(bxEnd - bx, GANTT_MIN_BAR_WIDTH)
    return (
      <rect
        x={bx} y={cy - 3} width={bw} height={6}
        rx={2} fill="#64748b" opacity={0.35}
        style={{ pointerEvents: 'none' }}
      />
    )
  })() : null

  // Link handles (shown in link mode)
  const linkHandles = toolMode === 'link' ? (
    <>
      <circle
        cx={x} cy={cy} r={5}
        fill="#22c55e" stroke="white" strokeWidth={1.5}
        style={{ cursor: 'crosshair' }}
        onMouseDown={e => { e.stopPropagation(); onLinkStart(task.id, 'left', e.clientX, e.clientY) }}
      />
      <circle
        cx={x + w} cy={cy} r={5}
        fill="#22c55e" stroke="white" strokeWidth={1.5}
        style={{ cursor: 'crosshair' }}
        onMouseDown={e => { e.stopPropagation(); onLinkStart(task.id, 'right', e.clientX, e.clientY) }}
      />
    </>
  ) : null

  // ── Milestone diamond ────────────────────────────────────────────────────────
  if (task.isMilestone) {
    const r = Math.max(6, rowHeight / 6)
    const mx = dateToX(scheduled.earlyStart, viewStart, pxPerDay) + pxPerDay / 2
    return (
      <g onClick={() => onClick(task.id)} style={{ cursor: 'pointer' }}>
        {baselineEl}
        <polygon
          points={`${mx},${cy - r} ${mx + r},${cy} ${mx},${cy + r} ${mx - r},${cy}`}
          fill={scheduled.isCritical ? '#ef4444' : '#8b5cf6'}
          stroke={isSelected ? '#1d4ed8' : 'white'}
          strokeWidth={isSelected ? 2 : 1.5}
        />
        {toolMode === 'link' && (
          <circle cx={mx} cy={cy} r={5} fill="#22c55e" stroke="white" strokeWidth={1.5}
            style={{ cursor: 'crosshair' }}
            onMouseDown={e => { e.stopPropagation(); onLinkStart(task.id, 'right', e.clientX, e.clientY) }} />
        )}
      </g>
    )
  }

  // ── Summary bar ──────────────────────────────────────────────────────────────
  if (task.isSummary) {
    return (
      <g onClick={() => onClick(task.id)} style={{ cursor: 'pointer' }}>
        {baselineEl}
        <rect x={x} y={y + 2} width={w} height={barH - 4} rx={2} fill="#1e293b" opacity={0.7} />
        <rect x={x} y={y + 2} width={w * (task.percentComplete / 100)} height={barH - 4} rx={2} fill="#1e293b" />
        <polygon points={`${x},${y + 2} ${x + 6},${y + 2} ${x},${y + barH - 2}`} fill="#1e293b" />
        <polygon points={`${x + w},${y + 2} ${x + w - 6},${y + 2} ${x + w},${y + barH - 2}`} fill="#1e293b" />
        {isSelected && <rect x={x} y={y + 2} width={w} height={barH - 4} rx={2} fill="none" stroke="#1d4ed8" strokeWidth={2} />}
        {linkHandles}
      </g>
    )
  }

  // ── Regular task bar ──────────────────────────────────────────────────────────
  const labelVisible = showLabel && w > 40
  const clipId = `clip-${task.id}`

  return (
    <g>
      {baselineEl}
      {/* Main bar */}
      <rect x={x} y={y} width={w} height={barH} rx={3} fill={color} opacity={0.85}
        onClick={() => onClick(task.id)} style={{ cursor: toolMode === 'select' ? 'pointer' : 'default' }} />
      {/* Progress fill */}
      {task.percentComplete > 0 && (
        <rect x={x} y={y} width={w * (task.percentComplete / 100)} height={barH} rx={3} fill={color} opacity={0.4} />
      )}
      {/* Progress stripe */}
      {task.percentComplete > 0 && (
        <rect x={x} y={y + barH - 3} width={w * (task.percentComplete / 100)} height={3} fill="white" opacity={0.5} />
      )}
      {/* Selection outline */}
      {isSelected && <rect x={x} y={y} width={w} height={barH} rx={3} fill="none" stroke="#1d4ed8" strokeWidth={2} />}
      {/* Bar label */}
      {labelVisible && (
        <>
          <defs>
            <clipPath id={clipId}>
              <rect x={x + 4} y={y} width={Math.max(w - 8, 0)} height={barH} />
            </clipPath>
          </defs>
          <text
            x={x + 6} y={y + barH / 2 + 4}
            fontSize={Math.max(9, Math.min(11, rowHeight / 4))}
            fill="white" clipPath={`url(#${clipId})`}
            style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 500 }}
          >
            {task.name}
          </text>
        </>
      )}
      {/* Drag handles (select mode only) */}
      {toolMode === 'select' && (
        <>
          <rect x={x} y={y} width={Math.max(w - 6, 0)} height={barH} fill="transparent"
            style={{ cursor: 'grab' }}
            onMouseDown={e => { e.stopPropagation(); onDragStart(task.id, 'move', e.clientX) }} />
          <rect x={x + w - 6} y={y} width={6} height={barH} rx={3} fill="white" opacity={0.3}
            style={{ cursor: 'ew-resize' }}
            onMouseDown={e => { e.stopPropagation(); onDragStart(task.id, 'resize-right', e.clientX) }} />
        </>
      )}
      {/* Link handles (link mode) */}
      {linkHandles}
    </g>
  )
}
