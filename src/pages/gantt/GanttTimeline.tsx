import React from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { GANTT_HEADER_HEIGHT } from '@/utils/constants'
import { toISODate } from '@/utils/dateUtils'
import type { Task, ScheduledTask, Dependency, Resource, BaselineTask } from '@/types'
import type { ToolMode, ColorBy } from './types'
import { GanttBar } from './GanttBar'
import { DependencyArrow } from './DependencyArrow'
import { dateToX } from './GanttBar'

// ─── Sub-components ───────────────────────────────────────────────────────────

function GanttHeader({ viewStart, totalDays, pxPerDay, hdrH }: {
  viewStart: Date; totalDays: number; pxPerDay: number; hdrH: number
}) {
  const days = Array.from({ length: totalDays }, (_, i) => addDays(viewStart, i))

  if (pxPerDay >= 20) {
    const weeks: { label: string; x: number; w: number }[] = []
    let weekStart = 0, weekLabel = ''
    days.forEach((d, i) => {
      if (i === 0 || d.getDay() === 1) {
        if (i > 0) weeks.push({ label: weekLabel, x: weekStart * pxPerDay, w: (i - weekStart) * pxPerDay })
        weekStart = i; weekLabel = format(d, 'MMM d')
      }
      if (i === days.length - 1) weeks.push({ label: weekLabel, x: weekStart * pxPerDay, w: (i - weekStart + 1) * pxPerDay })
    })
    return (
      <g>
        {weeks.map((w, i) => (
          <g key={i}>
            <rect x={w.x} y={0} width={w.w} height={hdrH / 2} fill={i % 2 === 0 ? '#f8fafc' : '#f1f5f9'} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={w.x + 4} y={hdrH / 4 + 5} fontSize={10} fill="#64748b" style={{ userSelect: 'none' }}>{w.label}</text>
          </g>
        ))}
        {days.map((d, i) => (
          <g key={i}>
            <rect x={i * pxPerDay} y={hdrH / 2} width={pxPerDay} height={hdrH / 2}
              fill={d.getDay() === 0 || d.getDay() === 6 ? '#fee2e2' : i % 2 === 0 ? '#f8fafc' : '#fff'}
              stroke="#e2e8f0" strokeWidth={0.5} />
            {pxPerDay >= 30 && (
              <text x={i * pxPerDay + pxPerDay / 2} y={hdrH - 6} fontSize={9} fill="#94a3b8" textAnchor="middle" style={{ userSelect: 'none' }}>
                {d.getDate()}
              </text>
            )}
          </g>
        ))}
      </g>
    )
  }

  // Month / quarter view
  const months: { label: string; x: number; w: number }[] = []
  let cur: Date | null = null, mStart = 0
  days.forEach((d, i) => {
    const mKey = format(d, 'yyyy-MM')
    if (!cur || format(cur, 'yyyy-MM') !== mKey) {
      if (cur) months.push({ label: format(cur, 'MMM yyyy'), x: mStart * pxPerDay, w: (i - mStart) * pxPerDay })
      cur = d; mStart = i
    }
    if (i === days.length - 1) months.push({ label: format(d, 'MMM yyyy'), x: mStart * pxPerDay, w: (i - mStart + 1) * pxPerDay })
  })
  return (
    <g>
      {months.map((m, i) => (
        <g key={i}>
          <rect x={m.x} y={0} width={m.w} height={hdrH} fill={i % 2 === 0 ? '#f8fafc' : '#f1f5f9'} stroke="#e2e8f0" strokeWidth={0.5} />
          <text x={m.x + 4} y={hdrH / 2 + 5} fontSize={11} fill="#475569" fontWeight="500" style={{ userSelect: 'none' }}>{m.label}</text>
        </g>
      ))}
    </g>
  )
}

function GanttGridLines({ viewStart, totalDays, pxPerDay, totalRows, rowHeight, hdrH }: {
  viewStart: Date; totalDays: number; pxPerDay: number; totalRows: number; rowHeight: number; hdrH: number
}) {
  const totalHeight = totalRows * rowHeight
  const days = Array.from({ length: totalDays }, (_, i) => addDays(viewStart, i))
  return (
    <g>
      {Array.from({ length: totalRows }, (_, i) => (
        <rect key={i} x={0} y={i * rowHeight} width={totalDays * pxPerDay} height={rowHeight}
          fill={i % 2 === 0 ? '#ffffff' : '#f8fafc'} />
      ))}
      {days.map((d, i) => {
        const isWeekend = d.getDay() === 0 || d.getDay() === 6
        const showLine = pxPerDay >= 6 && (pxPerDay >= 20 || d.getDate() === 1)
        return (
          <g key={i}>
            {isWeekend && <rect x={i * pxPerDay} y={0} width={pxPerDay} height={totalHeight} fill="#f1f5f9" opacity={0.5} />}
            {showLine && <line x1={i * pxPerDay} y1={0} x2={i * pxPerDay} y2={totalHeight} stroke="#e2e8f0" strokeWidth={0.5} />}
          </g>
        )
      })}
      {Array.from({ length: totalRows + 1 }, (_, i) => (
        <line key={i} x1={0} y1={i * rowHeight} x2={totalDays * pxPerDay} y2={i * rowHeight} stroke="#e2e8f0" strokeWidth={0.5} />
      ))}
    </g>
  )
}

function TodayLine({ viewStart, pxPerDay, totalRows, rowHeight }: {
  viewStart: Date; pxPerDay: number; totalRows: number; rowHeight: number
}) {
  const today = toISODate(new Date())
  const x = dateToX(today, viewStart, pxPerDay)
  if (x < 0) return null
  const h = totalRows * rowHeight
  return (
    <g>
      <line x1={x} y1={0} x2={x} y2={h} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4,3" />
      <rect x={x - 16} y={0} width={32} height={14} rx={2} fill="#3b82f6" />
      <text x={x} y={10} fontSize={8} fill="white" textAnchor="middle" fontWeight="bold" style={{ userSelect: 'none' }}>TODAY</text>
    </g>
  )
}

// ─── Link drag preview ────────────────────────────────────────────────────────

interface LinkDragState {
  sourceTaskId: string
  startX: number  // SVG x
  startY: number  // SVG y
  curX: number
  curY: number
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface GanttTimelineProps {
  svgRef: React.RefObject<SVGSVGElement | null>
  orderedIds: string[]
  tasks: Record<string, Task>
  schedule: Record<string, ScheduledTask>
  dependencies: Dependency[]
  resources: Record<string, Resource>
  baselineTasks: Record<string, BaselineTask>  // keyed by taskId
  viewStart: Date
  totalDays: number
  pxPerDay: number
  rowHeight: number
  colorBy: ColorBy
  showLabels: boolean
  toolMode: ToolMode
  selectedTaskId: string | null
  selectedDepId: string | null
  linkDrag: LinkDragState | null
  onDragStart: (taskId: string, type: 'move' | 'resize-right', clientX: number) => void
  onBarClick: (taskId: string) => void
  onLinkStart: (taskId: string, edge: 'left' | 'right', clientX: number, clientY: number) => void
  onDepClick: (depId: string) => void
  onDepDelete: (depId: string) => void
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseUp: (e: React.MouseEvent<SVGSVGElement>) => void
  onSvgClick: () => void
}

// ─── GanttTimeline ────────────────────────────────────────────────────────────

export function GanttTimeline({
  svgRef, orderedIds, tasks, schedule, dependencies, resources, baselineTasks,
  viewStart, totalDays, pxPerDay, rowHeight, colorBy, showLabels, toolMode,
  selectedTaskId, selectedDepId, linkDrag,
  onDragStart, onBarClick, onLinkStart, onDepClick, onDepDelete,
  onMouseMove, onMouseUp, onSvgClick,
}: GanttTimelineProps) {
  const HDR_H = GANTT_HEADER_HEIGHT
  const svgWidth = totalDays * pxPerDay
  const svgHeight = orderedIds.length * rowHeight + HDR_H

  return (
    <svg
      ref={svgRef}
      width={svgWidth}
      height={svgHeight}
      style={{ display: 'block', minWidth: svgWidth }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onClick={onSvgClick}
    >
      {/* Header */}
      <g>
        <GanttHeader viewStart={viewStart} totalDays={totalDays} pxPerDay={pxPerDay} hdrH={HDR_H} />
      </g>

      {/* Body */}
      <g transform={`translate(0, ${HDR_H})`}>
        <GanttGridLines
          viewStart={viewStart} totalDays={totalDays} pxPerDay={pxPerDay}
          totalRows={orderedIds.length} rowHeight={rowHeight} hdrH={HDR_H}
        />
        <TodayLine viewStart={viewStart} pxPerDay={pxPerDay} totalRows={orderedIds.length} rowHeight={rowHeight} />

        {/* Dependency arrows */}
        {dependencies.map(dep => (
          <DependencyArrow
            key={dep.id}
            dep={dep}
            tasks={tasks}
            schedule={schedule}
            orderedIds={orderedIds}
            viewStart={viewStart}
            pxPerDay={pxPerDay}
            rowHeight={rowHeight}
            isSelected={selectedDepId === dep.id}
            onClick={onDepClick}
            onDelete={onDepDelete}
          />
        ))}

        {/* Task bars */}
        {orderedIds.map((tid, rowIndex) => {
          const task = tasks[tid]
          const sched = schedule[tid]
          if (!task || !sched) return null
          return (
            <GanttBar
              key={tid}
              task={task}
              scheduled={sched}
              rowIndex={rowIndex}
              viewStart={viewStart}
              pxPerDay={pxPerDay}
              rowHeight={rowHeight}
              colorBy={colorBy}
              showLabel={showLabels}
              resources={resources}
              baselineTask={baselineTasks[tid] ?? null}
              toolMode={toolMode}
              isSelected={selectedTaskId === tid}
              onDragStart={onDragStart}
              onClick={onBarClick}
              onLinkStart={onLinkStart}
            />
          )
        })}

        {/* Link drag preview line */}
        {linkDrag && (
          <line
            x1={linkDrag.startX}
            y1={linkDrag.startY}
            x2={linkDrag.curX}
            y2={linkDrag.curY}
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="6,3"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </g>
    </svg>
  )
}
