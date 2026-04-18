import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useStore } from '@/store'
import { useParams } from 'react-router-dom'
import { getOrderedTaskIds } from '@/utils/wbsUtils'
import { toISODate } from '@/utils/dateUtils'
import { addDays, parseISO } from 'date-fns'
import { GANTT_HEADER_HEIGHT } from '@/utils/constants'
import type { DependencyType, BaselineTask } from '@/types'
import { ROW_HEIGHTS, type ToolMode } from './gantt/types'
import { GanttToolbar } from './gantt/GanttToolbar'
import { GanttLeftPanel } from './gantt/GanttLeftPanel'
import { GanttTimeline } from './gantt/GanttTimeline'
import { dateToX } from './gantt/GanttBar'

// ─── Zoom levels ──────────────────────────────────────────────────────────────

const ZOOM_LEVELS = [
  { label: 'Day', pxPerDay: 40 },
  { label: 'Week', pxPerDay: 20 },
  { label: 'Month', pxPerDay: 6 },
  { label: 'Quarter', pxPerDay: 2 },
]

// ─── Task Detail Panel ────────────────────────────────────────────────────────

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
            <div>
              <label className="text-xs text-slate-500 block">% Complete</label>
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

  // Store data
  const tasks = useStore(s => s.tasks)
  const schedule = useStore(s => s.schedule)
  const dependencies = useStore(s => s.dependencies)
  const projects = useStore(s => s.projects)
  const resources = useStore(s => s.resources)
  const baselines = useStore(s => s.baselines)
  const scheduleError = useStore(s => s.scheduleError)
  const updateTask = useStore(s => s.updateTask)
  const addDependency = useStore(s => s.addDependency)
  const removeDependency = useStore(s => s.removeDependency)
  const createBaseline = useStore(s => s.createBaseline)
  const deleteBaseline = useStore(s => s.deleteBaseline)

  // Gantt UI state from store
  const colorBy = useStore(s => s.ganttColorBy)
  const showLabels = useStore(s => s.ganttShowLabels)
  const rowHeightKey = useStore(s => s.ganttRowHeight)
  const visibleColumns = useStore(s => s.ganttVisibleColumns)
  const setGanttColorBy = useStore(s => s.setGanttColorBy)
  const setGanttShowLabels = useStore(s => s.setGanttShowLabels)
  const setGanttRowHeight = useStore(s => s.setGanttRowHeight)
  const setGanttVisibleColumns = useStore(s => s.setGanttVisibleColumns)

  // Local UI state
  const [zoomIdx, setZoomIdx] = useState(1)
  const [toolMode, setToolMode] = useState<ToolMode>('select')
  const [newLinkType, setNewLinkType] = useState<DependencyType>('FS')
  const [newLinkLag, setNewLinkLag] = useState(0)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedDepId, setSelectedDepId] = useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [showBaselineId, setShowBaselineId] = useState<string | null>(null)
  const [scrollTop, setScrollTop] = useState(0)

  // Link drag state (SVG coordinates)
  const [linkDrag, setLinkDrag] = useState<{
    sourceTaskId: string; startX: number; startY: number; curX: number; curY: number
  } | null>(null)
  const linkDragSourceRef = useRef<{ taskId: string; edge: 'left' | 'right' } | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const project = projectId ? projects[projectId] : null
  const pxPerDay = ZOOM_LEVELS[zoomIdx].pxPerDay
  const rowHeight = ROW_HEIGHTS[rowHeightKey]
  const orderedIds = projectId ? getOrderedTaskIds(tasks, projectId) : []
  const projectDeps = projectId
    ? Object.values(dependencies).filter(d => d.projectId === projectId)
    : []

  // View range
  const startDate = project ? parseISO(project.plannedStart) : new Date()
  const endDate = project ? parseISO(project.plannedEnd) : addDays(new Date(), 90)
  const paddedStart = addDays(startDate, -7)
  const paddedEnd = addDays(endDate, 14)
  const totalDays = Math.max(Math.ceil((paddedEnd.getTime() - paddedStart.getTime()) / 86400000), 30)

  // Baseline task lookup
  const baselineTaskMap: Record<string, BaselineTask> = {}
  if (showBaselineId && baselines[showBaselineId]) {
    for (const bt of baselines[showBaselineId].tasks) {
      baselineTaskMap[bt.taskId] = bt
    }
  }

  // ─── Bar drag ──────────────────────────────────────────────────────────────
  const dragRef = useRef<{
    taskId: string; type: 'move' | 'resize-right'
    startX: number; origStart: string; origEnd: string; origDuration: number
  } | null>(null)

  const handleDragStart = useCallback((taskId: string, type: 'move' | 'resize-right', clientX: number) => {
    if (toolMode !== 'select') return
    const task = tasks[taskId]
    const sched = schedule[taskId]
    if (!task || !sched) return
    dragRef.current = {
      taskId, type, startX: clientX,
      origStart: sched.earlyStart, origEnd: sched.earlyFinish, origDuration: task.plannedDuration,
    }
  }, [tasks, schedule, toolMode])

  // ─── Link drag ─────────────────────────────────────────────────────────────
  const handleLinkStart = useCallback((taskId: string, edge: 'left' | 'right', clientX: number, clientY: number) => {
    if (toolMode !== 'link') return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const svgX = clientX - rect.left
    const svgY = clientY - rect.top - GANTT_HEADER_HEIGHT
    linkDragSourceRef.current = { taskId, edge }
    setLinkDrag({ sourceTaskId: taskId, startX: svgX, startY: svgY, curX: svgX, curY: svgY })
  }, [toolMode])

  // ─── SVG mouse events ─────────────────────────────────────────────────────
  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.startX
      const deltaDays = Math.round(dx / pxPerDay)
      if (deltaDays === 0) return
      const { taskId, type, origStart, origDuration } = dragRef.current
      const task = tasks[taskId]
      if (!task) return
      if (type === 'move') {
        updateTask(taskId, { plannedStart: toISODate(addDays(parseISO(origStart), deltaDays)), schedulingMode: 'manual' })
      } else {
        updateTask(taskId, { plannedDuration: Math.max(1, origDuration + deltaDays) })
      }
      return
    }
    if (linkDragSourceRef.current) {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      setLinkDrag(prev => prev
        ? { ...prev, curX: e.clientX - rect.left, curY: e.clientY - rect.top - GANTT_HEADER_HEIGHT }
        : null
      )
    }
  }, [pxPerDay, tasks, updateTask])

  const handleSvgMouseUp = useCallback(() => {
    dragRef.current = null
    linkDragSourceRef.current = null
    setLinkDrag(null)
  }, [])

  // ─── Bar click (also handles link completion) ─────────────────────────────
  const handleBarClick = useCallback((taskId: string) => {
    if (toolMode === 'link' && linkDragSourceRef.current) {
      const src = linkDragSourceRef.current
      if (projectId && src.taskId !== taskId) {
        addDependency({ projectId, predecessorId: src.taskId, successorId: taskId, type: newLinkType, lagDays: newLinkLag })
      }
      linkDragSourceRef.current = null
      setLinkDrag(null)
    } else {
      setSelectedTaskId(prev => prev === taskId ? null : taskId)
      setSelectedDepId(null)
    }
  }, [toolMode, projectId, addDependency, newLinkType, newLinkLag])

  // ─── Keyboard: Escape ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        linkDragSourceRef.current = null
        setLinkDrag(null)
        setSelectedDepId(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ─── Scroll to today on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      const todayX = dateToX(toISODate(new Date()), paddedStart, pxPerDay)
      scrollRef.current.scrollLeft = Math.max(0, todayX - 200)
    }
  }, [pxPerDay]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Sync left panel scroll with right scroll ─────────────────────────────
  const handleRightScroll = useCallback(() => {
    setScrollTop(scrollRef.current?.scrollTop ?? 0)
  }, [])

  // ─── Navigation ──────────────────────────────────────────────────────────
  const jumpToday = useCallback(() => {
    if (!scrollRef.current) return
    const todayX = dateToX(toISODate(new Date()), paddedStart, pxPerDay)
    scrollRef.current.scrollLeft = Math.max(0, todayX - 200)
  }, [paddedStart, pxPerDay])

  const jumpStart = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0
  }, [])

  // ─── Export SVG ───────────────────────────────────────────────────────────
  const handleExportSvg = useCallback(() => {
    if (!svgRef.current) return
    const blob = new Blob([svgRef.current.outerHTML], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `${project?.name ?? 'gantt'}.svg`; a.click()
    URL.revokeObjectURL(url)
  }, [project])

  // ─── Export PNG ───────────────────────────────────────────────────────────
  const handleExportPng = useCallback(async () => {
    const el = document.getElementById('gantt-export-target')
    if (!el) return
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(el, { scale: 2, useCORS: true })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a'); a.href = url
      a.download = `${project?.name ?? 'gantt'}.png`; a.click()
    } catch {
      console.warn('PNG export unavailable')
    }
  }, [project])

  // ─── Baseline ────────────────────────────────────────────────────────────
  const projectBaselines = projectId
    ? Object.values(baselines).filter(b => b.projectId === projectId)
    : []
  const latestBaseline = projectBaselines[projectBaselines.length - 1] ?? null

  const handleSetBaseline = useCallback(() => {
    if (!projectId) return
    const id = createBaseline(projectId)
    setShowBaselineId(id)
  }, [projectId, createBaseline])

  const handleClearBaseline = useCallback(() => {
    if (!latestBaseline) return
    if (showBaselineId === latestBaseline.id) setShowBaselineId(null)
    deleteBaseline(latestBaseline.id)
  }, [latestBaseline, showBaselineId, deleteBaseline])

  if (!project) return <div className="p-6 text-slate-500">Project not found.</div>

  const hasCriticalPath = Object.values(schedule).some(s => s.isCritical)

  return (
    <div className="flex flex-col h-full">
      <GanttToolbar
        toolMode={toolMode}
        onToolMode={setToolMode}
        newLinkType={newLinkType}
        onNewLinkType={setNewLinkType}
        newLinkLag={newLinkLag}
        onNewLinkLag={setNewLinkLag}
        zoomIdx={zoomIdx}
        onZoomIn={() => setZoomIdx(i => Math.max(0, i - 1))}
        onZoomOut={() => setZoomIdx(i => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
        zoomLabel={ZOOM_LEVELS[zoomIdx].label}
        maxZoom={ZOOM_LEVELS.length - 1}
        onJumpToday={jumpToday}
        onJumpStart={jumpStart}
        colorBy={colorBy}
        onColorBy={setGanttColorBy}
        showLabels={showLabels}
        onShowLabels={setGanttShowLabels}
        rowHeight={rowHeightKey}
        onRowHeight={setGanttRowHeight}
        visibleColumns={visibleColumns}
        onVisibleColumns={setGanttVisibleColumns}
        hasBaseline={projectBaselines.length > 0}
        onSetBaseline={handleSetBaseline}
        onClearBaseline={handleClearBaseline}
        onExportSvg={handleExportSvg}
        onExportPng={handleExportPng}
        hasCriticalPath={hasCriticalPath}
        scheduleError={scheduleError}
      />

      <div id="gantt-export-target" className="flex flex-1 overflow-hidden">
        <GanttLeftPanel
          orderedIds={orderedIds}
          tasks={tasks}
          schedule={schedule}
          selectedTaskId={selectedTaskId}
          onSelect={id => { setSelectedTaskId(prev => prev === id ? null : id); setSelectedDepId(null) }}
          rowHeight={rowHeight}
          visibleColumns={visibleColumns}
          editingTaskId={editingTaskId}
          onEditStart={setEditingTaskId}
          onEditCommit={(tid, name) => { updateTask(tid, { name }); setEditingTaskId(null) }}
          onEditCancel={() => setEditingTaskId(null)}
          scrollTop={scrollTop}
        />

        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          style={{ cursor: dragRef.current ? 'grabbing' : toolMode === 'link' ? 'crosshair' : 'default' }}
          onScroll={handleRightScroll}
        >
          <GanttTimeline
            svgRef={svgRef}
            orderedIds={orderedIds}
            tasks={tasks}
            schedule={schedule}
            dependencies={projectDeps}
            resources={resources}
            baselineTasks={baselineTaskMap}
            viewStart={paddedStart}
            totalDays={totalDays}
            pxPerDay={pxPerDay}
            rowHeight={rowHeight}
            colorBy={colorBy}
            showLabels={showLabels}
            toolMode={toolMode}
            selectedTaskId={selectedTaskId}
            selectedDepId={selectedDepId}
            linkDrag={linkDrag}
            onDragStart={handleDragStart}
            onBarClick={handleBarClick}
            onLinkStart={handleLinkStart}
            onDepClick={id => { setSelectedDepId(prev => prev === id ? null : id); setSelectedTaskId(null) }}
            onDepDelete={removeDependency}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onSvgClick={() => { if (!linkDragSourceRef.current) setSelectedDepId(null) }}
          />
        </div>
      </div>

      {selectedTaskId && (
        <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      )}
    </div>
  )
}
