import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useStore } from '@/store'
import { useParams } from 'react-router-dom'
import { getOrderedTaskIds } from '@/utils/wbsUtils'
import { calendarDaysBetween, fromISODate, toISODate } from '@/utils/dateUtils'
import { addDays, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { GANTT_ROW_HEIGHT, GANTT_HEADER_HEIGHT, GANTT_LEFT_WIDTH } from '@/utils/constants'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, AlignLeft, Download } from 'lucide-react'
import type { Task, ScheduledTask, Dependency } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_H = GANTT_ROW_HEIGHT
const HDR_H = GANTT_HEADER_HEIGHT
const LEFT_W = GANTT_LEFT_WIDTH
const ZOOM_LEVELS = [
  { label: 'Day', pxPerDay: 40 },
  { label: 'Week', pxPerDay: 20 },
  { label: 'Month', pxPerDay: 6 },
  { label: 'Quarter', pxPerDay: 2 },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dateToX(date: string, viewStart: Date, pxPerDay: number): number {
  const d = parseISO(date)
  const days = Math.round((d.getTime() - viewStart.getTime()) / 86400000)
  return days * pxPerDay
}

function getStatusColor(task: Task, isCritical: boolean): string {
  if (isCritical) return '#ef4444'
  if (task.status === 'completed') return '#22c55e'
  if (task.status === 'in_progress') return '#3b82f6'
  if (task.status === 'on_hold') return '#f97316'
  return '#94a3b8'
}

// ─── Grid Header ──────────────────────────────────────────────────────────────

function GanttHeader({ viewStart, totalDays, pxPerDay }: { viewStart: Date; totalDays: number; pxPerDay: number }) {
  const days = Array.from({ length: totalDays }, (_, i) => addDays(viewStart, i))

  if (pxPerDay >= 20) {
    // Day view: show weeks on top, days below
    const weeks: { label: string; x: number; w: number }[] = []
    let weekStart = 0
    let weekLabel = ''
    days.forEach((d, i) => {
      if (i === 0 || d.getDay() === 1) {
        if (i > 0) weeks.push({ label: weekLabel, x: weekStart * pxPerDay, w: (i - weekStart) * pxPerDay })
        weekStart = i
        weekLabel = format(d, 'MMM d')
      }
      if (i === days.length - 1) weeks.push({ label: weekLabel, x: weekStart * pxPerDay, w: (i - weekStart + 1) * pxPerDay })
    })
    return (
      <g>
        {/* Month row */}
        {weeks.map((w, i) => (
          <g key={i}>
            <rect x={w.x} y={0} width={w.w} height={HDR_H / 2} fill={i % 2 === 0 ? '#f8fafc' : '#f1f5f9'} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={w.x + 4} y={HDR_H / 4 + 5} fontSize={10} fill="#64748b" style={{ userSelect: 'none' }}>{w.label}</text>
          </g>
        ))}
        {/* Day row */}
        {days.map((d, i) => (
          <g key={i}>
            <rect x={i * pxPerDay} y={HDR_H / 2} width={pxPerDay} height={HDR_H / 2}
              fill={d.getDay() === 0 || d.getDay() === 6 ? '#fee2e2' : i % 2 === 0 ? '#f8fafc' : '#fff'}
              stroke="#e2e8f0" strokeWidth={0.5} />
            {pxPerDay >= 30 && (
              <text x={i * pxPerDay + pxPerDay / 2} y={HDR_H - 6} fontSize={9} fill="#94a3b8" textAnchor="middle" style={{ userSelect: 'none' }}>
                {d.getDate()}
              </text>
            )}
          </g>
        ))}
      </g>
    )
  } else {
    // Month view
    const months: { label: string; x: number; w: number }[] = []
    let cur: Date | null = null
    let mStart = 0
    days.forEach((d, i) => {
      const mKey = format(d, 'yyyy-MM')
      if (!cur || format(cur, 'yyyy-MM') !== mKey) {
        if (cur) months.push({ label: format(cur, 'MMM yyyy'), x: mStart * pxPerDay, w: (i - mStart) * pxPerDay })
        cur = d
        mStart = i
      }
      if (i === days.length - 1) months.push({ label: format(d, 'MMM yyyy'), x: mStart * pxPerDay, w: (i - mStart + 1) * pxPerDay })
    })
    return (
      <g>
        {months.map((m, i) => (
          <g key={i}>
            <rect x={m.x} y={0} width={m.w} height={HDR_H} fill={i % 2 === 0 ? '#f8fafc' : '#f1f5f9'} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={m.x + 4} y={HDR_H / 2 + 5} fontSize={11} fill="#475569" fontWeight="500" style={{ userSelect: 'none' }}>{m.label}</text>
          </g>
        ))}
      </g>
    )
  }
}

// ─── Grid Lines ───────────────────────────────────────────────────────────────

function GanttGridLines({ viewStart, totalDays, pxPerDay, totalRows }: {
  viewStart: Date; totalDays: number; pxPerDay: number; totalRows: number
}) {
  const totalHeight = totalRows * ROW_H
  const days = Array.from({ length: totalDays }, (_, i) => addDays(viewStart, i))

  return (
    <g>
      {/* Row stripes */}
      {Array.from({ length: totalRows }, (_, i) => (
        <rect key={i} x={0} y={i * ROW_H} width={totalDays * pxPerDay} height={ROW_H}
          fill={i % 2 === 0 ? '#ffffff' : '#f8fafc'} />
      ))}
      {/* Weekend shading + column lines */}
      {days.map((d, i) => {
        const isWeekend = d.getDay() === 0 || d.getDay() === 6
        const showLine = pxPerDay >= 6 && (pxPerDay >= 20 || d.getDate() === 1)
        return (
          <g key={i}>
            {isWeekend && (
              <rect x={i * pxPerDay} y={0} width={pxPerDay} height={totalHeight} fill="#f1f5f9" opacity={0.5} />
            )}
            {showLine && (
              <line x1={i * pxPerDay} y1={0} x2={i * pxPerDay} y2={totalHeight} stroke="#e2e8f0" strokeWidth={0.5} />
            )}
          </g>
        )
      })}
      {/* Row dividers */}
      {Array.from({ length: totalRows }, (_, i) => (
        <line key={i} x1={0} y1={i * ROW_H} x2={totalDays * pxPerDay} y2={i * ROW_H} stroke="#e2e8f0" strokeWidth={0.5} />
      ))}
    </g>
  )
}

// ─── Today Line ───────────────────────────────────────────────────────────────

function TodayLine({ viewStart, pxPerDay, totalRows }: { viewStart: Date; pxPerDay: number; totalRows: number }) {
  const today = toISODate(new Date())
  const x = dateToX(today, viewStart, pxPerDay)
  if (x < 0) return null
  const h = totalRows * ROW_H
  return (
    <g>
      <line x1={x} y1={0} x2={x} y2={h} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4,3" />
      <rect x={x - 16} y={0} width={32} height={14} rx={2} fill="#3b82f6" />
      <text x={x} y={10} fontSize={8} fill="white" textAnchor="middle" fontWeight="bold" style={{ userSelect: 'none' }}>TODAY</text>
    </g>
  )
}

// ─── Task Bar ─────────────────────────────────────────────────────────────────

interface BarProps {
  task: Task
  scheduled: ScheduledTask
  rowIndex: number
  viewStart: Date
  pxPerDay: number
  onDragStart: (taskId: string, type: 'move' | 'resize-right', startX: number) => void
  onClick: (taskId: string) => void
}

function GanttBar({ task, scheduled, rowIndex, viewStart, pxPerDay, onDragStart, onClick }: BarProps) {
  const y = rowIndex * ROW_H + 6
  const barH = task.isMilestone ? 0 : ROW_H - 12
  const x = dateToX(scheduled.earlyStart, viewStart, pxPerDay)
  const xEnd = dateToX(scheduled.earlyFinish, viewStart, pxPerDay) + pxPerDay
  const w = Math.max(xEnd - x, 8)
  const color = getStatusColor(task, scheduled.isCritical)

  if (task.isMilestone) {
    // Diamond shape
    const cx = dateToX(scheduled.earlyStart, viewStart, pxPerDay) + pxPerDay / 2
    const cy = rowIndex * ROW_H + ROW_H / 2
    const r = 7
    return (
      <g onClick={() => onClick(task.id)} style={{ cursor: 'pointer' }}>
        <polygon
          points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
          fill={scheduled.isCritical ? '#ef4444' : '#8b5cf6'}
          stroke="white" strokeWidth={1.5}
        />
      </g>
    )
  }

  if (task.isSummary) {
    return (
      <g onClick={() => onClick(task.id)} style={{ cursor: 'pointer' }}>
        <rect x={x} y={y + 2} width={w} height={barH - 4} rx={2} fill="#1e293b" opacity={0.7} />
        {/* Completion fill */}
        <rect x={x} y={y + 2} width={w * (task.percentComplete / 100)} height={barH - 4} rx={2} fill="#1e293b" />
        {/* Left/right chevrons */}
        <polygon points={`${x},${y + 2} ${x + 6},${y + 2} ${x},${y + barH - 2}`} fill="#1e293b" />
        <polygon points={`${x + w},${y + 2} ${x + w - 6},${y + 2} ${x + w},${y + barH - 2}`} fill="#1e293b" />
      </g>
    )
  }

  return (
    <g>
      {/* Main bar */}
      <rect
        x={x} y={y} width={w} height={barH} rx={3}
        fill={color} opacity={0.85}
        onClick={() => onClick(task.id)}
        style={{ cursor: 'pointer' }}
      />
      {/* Progress fill */}
      {task.percentComplete > 0 && (
        <rect x={x} y={y} width={w * (task.percentComplete / 100)} height={barH} rx={3} fill={color} opacity={0.4} />
      )}
      {/* % stripe */}
      {task.percentComplete > 0 && (
        <rect x={x} y={y + barH - 3} width={w * (task.percentComplete / 100)} height={3} rx={0} fill="white" opacity={0.5} />
      )}
      {/* Move handle (full bar) */}
      <rect x={x} y={y} width={Math.max(w - 6, 0)} height={barH} fill="transparent"
        style={{ cursor: 'grab' }}
        onMouseDown={e => { e.stopPropagation(); onDragStart(task.id, 'move', e.clientX) }} />
      {/* Resize handle */}
      <rect x={x + w - 6} y={y} width={6} height={barH} rx={3} fill="white" opacity={0.3}
        style={{ cursor: 'ew-resize' }}
        onMouseDown={e => { e.stopPropagation(); onDragStart(task.id, 'resize-right', e.clientX) }} />
    </g>
  )
}

// ─── Dependency Arrow ─────────────────────────────────────────────────────────

function DependencyArrow({ dep, tasks, schedule, orderedIds, viewStart, pxPerDay }: {
  dep: Dependency
  tasks: Record<string, Task>
  schedule: Record<string, ScheduledTask>
  orderedIds: string[]
  viewStart: Date
  pxPerDay: number
}) {
  const pred = tasks[dep.predecessorId]
  const succ = tasks[dep.successorId]
  const predS = schedule[dep.predecessorId]
  const succS = schedule[dep.successorId]
  if (!pred || !succ || !predS || !succS) return null

  const predRow = orderedIds.indexOf(dep.predecessorId)
  const succRow = orderedIds.indexOf(dep.successorId)
  if (predRow < 0 || succRow < 0) return null

  const predX = dateToX(predS.earlyFinish, viewStart, pxPerDay) + pxPerDay
  const predY = predRow * ROW_H + ROW_H / 2
  const succX = dateToX(succS.earlyStart, viewStart, pxPerDay)
  const succY = succRow * ROW_H + ROW_H / 2

  const isCritical = predS.isCritical && succS.isCritical
  const color = isCritical ? '#ef4444' : '#94a3b8'

  // Simple elbow path
  const midX = predX + Math.max((succX - predX) / 2, 20)
  const d = `M ${predX} ${predY} L ${midX} ${predY} L ${midX} ${succY} L ${succX} ${succY}`

  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} markerEnd={`url(#arrow-${isCritical ? 'red' : 'grey'})`} />
    </g>
  )
}

// ─── Task Detail Slide-over ────────────────────────────────────────────────────

function TaskDetailPanel({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const task = useStore(s => taskId ? s.tasks[taskId] : null)
  const schedule = useStore(s => taskId ? s.schedule[taskId] : null)
  const resources = useStore(s => s.resources)
  const updateTask = useStore(s => s.updateTask)

  if (!task) return null

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l border-slate-200 z-40 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900 text-sm">Task Details</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-500">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-xs text-slate-500">Name</label>
          <p className="font-medium text-slate-900">{task.name}</p>
        </div>
        {schedule && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><label className="text-xs text-slate-500 block">Early Start</label>{schedule.earlyStart}</div>
            <div><label className="text-xs text-slate-500 block">Early Finish</label>{schedule.earlyFinish}</div>
            <div><label className="text-xs text-slate-500 block">Duration</label>{task.plannedDuration}d</div>
            <div><label className="text-xs text-slate-500 block">Float</label>{schedule.totalFloat}d</div>
            <div><label className="text-xs text-slate-500 block">Critical</label>{schedule.isCritical ? '🔴 Yes' : '✅ No'}</div>
            <div><label className="text-xs text-slate-500 block">% Complete</label>
              <input type="number" min={0} max={100}
                className="w-full border border-slate-300 rounded px-2 py-0.5 text-sm"
                value={task.percentComplete}
                onChange={e => updateTask(task.id, { percentComplete: Number(e.target.value) })} />
            </div>
          </div>
        )}
        {task.notes && (
          <div><label className="text-xs text-slate-500">Notes</label><p className="text-sm text-slate-700">{task.notes}</p></div>
        )}
        {task.assigneeIds.length > 0 && (
          <div>
            <label className="text-xs text-slate-500 block mb-1">Assignees</label>
            {task.assigneeIds.map(rid => resources[rid]).filter(Boolean).map(r => (
              <span key={r.id} className="inline-block bg-slate-100 rounded px-2 py-0.5 text-xs mr-1">{r.name}</span>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><label className="text-xs text-slate-500 block">Budget</label>${task.budgetAmount.toLocaleString()}</div>
          <div><label className="text-xs text-slate-500 block">Actual</label>${task.actualCost.toLocaleString()}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Gantt Page ──────────────────────────────────────────────────────────

export function GanttPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const tasks = useStore(s => s.tasks)
  const schedule = useStore(s => s.schedule)
  const dependencies = useStore(s => s.dependencies)
  const projects = useStore(s => s.projects)
  const updateTask = useStore(s => s.updateTask)

  const [zoomIdx, setZoomIdx] = useState(1) // default: Week
  const [scrollLeft, setScrollLeft] = useState(0)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const project = projectId ? projects[projectId] : null
  const pxPerDay = ZOOM_LEVELS[zoomIdx].pxPerDay
  const orderedIds = projectId ? getOrderedTaskIds(tasks, projectId) : []
  const projectDeps = projectId ? Object.values(dependencies).filter(d => d.projectId === projectId) : []

  // Compute view range
  const startDate = project ? parseISO(project.plannedStart) : new Date()
  const endDate = project ? parseISO(project.plannedEnd) : addDays(new Date(), 90)
  const paddedStart = addDays(startDate, -7)
  const paddedEnd = addDays(endDate, 14)
  const totalDays = Math.max(Math.ceil((paddedEnd.getTime() - paddedStart.getTime()) / 86400000), 30)
  const svgWidth = totalDays * pxPerDay
  const svgHeight = orderedIds.length * ROW_H + HDR_H

  // ─── Drag state ────────────────────────────────────────────────────────────
  const dragRef = useRef<{
    taskId: string
    type: 'move' | 'resize-right'
    startX: number
    origStart: string
    origEnd: string
    origDuration: number
  } | null>(null)

  const handleDragStart = useCallback((taskId: string, type: 'move' | 'resize-right', clientX: number) => {
    const task = tasks[taskId]
    const sched = schedule[taskId]
    if (!task || !sched) return
    dragRef.current = {
      taskId, type, startX: clientX,
      origStart: sched.earlyStart, origEnd: sched.earlyFinish,
      origDuration: task.plannedDuration,
    }
  }, [tasks, schedule])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const deltaDays = Math.round(dx / pxPerDay)
    if (deltaDays === 0) return
    const { taskId, type, origStart, origDuration } = dragRef.current
    const task = tasks[taskId]
    if (!task) return

    if (type === 'move') {
      const newStart = toISODate(addDays(parseISO(origStart), deltaDays))
      updateTask(taskId, {
        plannedStart: newStart,
        schedulingMode: 'manual',
      })
    } else if (type === 'resize-right') {
      const newDuration = Math.max(1, origDuration + deltaDays)
      updateTask(taskId, { plannedDuration: newDuration })
    }
  }, [pxPerDay, tasks, updateTask])

  const handleMouseUp = useCallback(() => {
    dragRef.current = null
  }, [])

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const todayX = dateToX(toISODate(new Date()), paddedStart, pxPerDay)
      scrollRef.current.scrollLeft = Math.max(0, todayX - 200)
    }
  }, [pxPerDay, paddedStart])

  const handleExportSvg = () => {
    if (!svgRef.current) return
    const svg = svgRef.current.outerHTML
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'gantt.svg'; a.click()
    URL.revokeObjectURL(url)
  }

  if (!project) return <div className="p-6 text-slate-500">Project not found.</div>

  return (
    <div className="flex flex-col h-full" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-white flex-shrink-0">
        <Button variant="outline" size="sm" onClick={() => setZoomIdx(i => Math.max(0, i - 1))} disabled={zoomIdx === 0}>
          <ZoomIn size={14} />
        </Button>
        <span className="text-sm text-slate-600 min-w-[60px] text-center">{ZOOM_LEVELS[zoomIdx].label}</span>
        <Button variant="outline" size="sm" onClick={() => setZoomIdx(i => Math.min(ZOOM_LEVELS.length - 1, i + 1))} disabled={zoomIdx === ZOOM_LEVELS.length - 1}>
          <ZoomOut size={14} />
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          if (scrollRef.current) {
            const todayX = dateToX(toISODate(new Date()), paddedStart, pxPerDay)
            scrollRef.current.scrollLeft = Math.max(0, todayX - 200)
          }
        }}>
          <AlignLeft size={14} className="mr-1" /> Today
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportSvg}>
          <Download size={14} className="mr-1" /> SVG
        </Button>
        {Object.values(schedule).some(s => s.isCritical) && (
          <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            <span className="w-2 h-2 bg-red-500 rounded-full" />Critical path active
          </span>
        )}
      </div>

      {/* Main split panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left task list */}
        <div className="flex-shrink-0 bg-white border-r border-slate-200 overflow-hidden flex flex-col" style={{ width: LEFT_W }}>
          {/* Header */}
          <div className="flex items-center px-3 bg-slate-50 border-b border-slate-200 font-medium text-xs text-slate-500 uppercase tracking-wide flex-shrink-0" style={{ height: HDR_H }}>
            Task Name
          </div>
          {/* Task rows (synced scroll) */}
          <div className="flex-1 overflow-hidden" id="gantt-left-scroll" style={{ overflowY: 'hidden' }}>
            {orderedIds.map((tid, i) => {
              const task = tasks[tid]
              if (!task) return null
              const sched = schedule[tid]
              const indent = (task.wbsNumber?.split('.').length || 1) - 1
              return (
                <div
                  key={tid}
                  className={`flex items-center px-2 text-sm border-b border-slate-100 cursor-pointer hover:bg-blue-50 ${selectedTaskId === tid ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                  style={{ height: ROW_H, paddingLeft: 8 + indent * 16 }}
                  onClick={() => setSelectedTaskId(tid === selectedTaskId ? null : tid)}
                >
                  {task.isMilestone && <span className="mr-1 text-purple-500">◆</span>}
                  <span className={`truncate text-xs ${task.isSummary ? 'font-semibold text-slate-800' : 'text-slate-700'} ${sched?.isCritical ? 'text-red-600' : ''}`}>
                    {task.wbsNumber && <span className="text-slate-400 mr-1">{task.wbsNumber}</span>}
                    {task.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right SVG timeline */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          style={{ cursor: dragRef.current ? 'grabbing' : 'default' }}
        >
          <svg
            ref={svgRef}
            width={svgWidth}
            height={svgHeight}
            style={{ display: 'block', minWidth: svgWidth }}
          >
            <defs>
              <marker id="arrow-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#ef4444" />
              </marker>
              <marker id="arrow-grey" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#94a3b8" />
              </marker>
            </defs>

            {/* Header */}
            <g transform={`translate(0, 0)`}>
              <GanttHeader viewStart={paddedStart} totalDays={totalDays} pxPerDay={pxPerDay} />
            </g>

            {/* Body */}
            <g transform={`translate(0, ${HDR_H})`}>
              <GanttGridLines viewStart={paddedStart} totalDays={totalDays} pxPerDay={pxPerDay} totalRows={orderedIds.length} />
              <TodayLine viewStart={paddedStart} pxPerDay={pxPerDay} totalRows={orderedIds.length} />

              {/* Dependency arrows */}
              {projectDeps.map(dep => (
                <DependencyArrow
                  key={dep.id}
                  dep={dep}
                  tasks={tasks}
                  schedule={schedule}
                  orderedIds={orderedIds}
                  viewStart={paddedStart}
                  pxPerDay={pxPerDay}
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
                    viewStart={paddedStart}
                    pxPerDay={pxPerDay}
                    onDragStart={handleDragStart}
                    onClick={setSelectedTaskId}
                  />
                )
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* Task detail slide-over */}
      {selectedTaskId && (
        <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      )}
    </div>
  )
}
