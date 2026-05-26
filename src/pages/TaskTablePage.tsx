import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from '@/store'
import { computeWbsNumbers, getOrderedTaskIds } from '@/utils/wbsUtils'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { TaskLibraryModal } from '@/components/tasks/TaskLibraryModal'
import {
  Plus, Trash2, ChevronRight, ChevronDown, ArrowUp, ArrowDown,
  IndentIncrease, IndentDecrease, Flag, Download, Layers, BookOpen,
  AlertTriangle, GitBranch,
} from 'lucide-react'
import { clsx } from 'clsx'
import type { Task, TaskStatus } from '@/types'
import type { LibraryPhase } from '@/data/envConsultancyLibrary'
import { exportTasksCsv } from '@/export/exportCsv'

// ─── Inline editable cell ─────────────────────────────────────────────────────

function EditableCell({
  value, onSave, type = 'text', className, placeholder,
}: {
  value: string | number
  onSave: (v: string) => void
  type?: string
  className?: string
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(String(value)) }, [value])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const commit = () => { onSave(draft); setEditing(false) }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        className={clsx('w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none bg-white', className)}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setDraft(String(value)); setEditing(false) }
        }}
        placeholder={placeholder}
      />
    )
  }
  return (
    <span
      className={clsx('block w-full px-1 py-0.5 text-sm cursor-text rounded hover:bg-blue-50 min-h-[22px]', className)}
      onDoubleClick={() => setEditing(true)}
      title="Double-click to edit"
    >
      {value === '' || (value === 0 && type === 'number')
        ? <span className="text-slate-400">{placeholder || '—'}</span>
        : String(value)}
    </span>
  )
}

// ─── Status select cell ────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'not_started', label: 'Not Started', color: 'bg-slate-100 text-slate-600' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'completed', label: 'Complete',   color: 'bg-green-100 text-green-700' },
  { value: 'on_hold',    label: 'On Hold',    color: 'bg-orange-100 text-orange-700' },
]

function StatusCell({ value, onChange }: { value: TaskStatus; onChange: (v: TaskStatus) => void }) {
  const opt = STATUS_OPTIONS.find(o => o.value === value) || STATUS_OPTIONS[0]
  return (
    <select
      className={clsx('text-xs rounded px-1 py-0.5 border-0 cursor-pointer font-medium w-full', opt.color)}
      value={value}
      onChange={e => onChange(e.target.value as TaskStatus)}
    >
      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ─── Predecessors cell ────────────────────────────────────────────────────────
// Displays predecessor WBS numbers (e.g. "1.1, 1.2") and allows inline editing.

function PredecessorsCell({
  taskId, projectId, wbsToId, idToWbs,
}: {
  taskId: string
  projectId: string
  wbsToId: Record<string, string>
  idToWbs: Record<string, string>
}) {
  const deps = useStore(s =>
    Object.values(s.dependencies).filter(d => d.projectId === projectId && d.successorId === taskId),
  )
  const addDependency = useStore(s => s.addDependency)
  const removeDependency = useStore(s => s.removeDependency)
  const scheduleError = useStore(s => s.scheduleError)

  const predWbs = deps.map(d => idToWbs[d.predecessorId] || '?').sort().join(', ')

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(predWbs)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(predWbs) }, [predWbs])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const commit = () => {
    setEditing(false)
    setError(null)
    const newWbs = draft.split(',').map(s => s.trim()).filter(Boolean)
    const newPredIds = newWbs.map(w => wbsToId[w]).filter(Boolean) as string[]

    // Warn about unresolved WBS numbers
    const unresolved = newWbs.filter(w => !wbsToId[w])
    if (unresolved.length) {
      setError(`Unknown WBS: ${unresolved.join(', ')}`)
    }

    const existingIds = new Set(deps.map(d => d.predecessorId))
    const newIds = new Set(newPredIds)

    // Remove stale deps
    for (const dep of deps) {
      if (!newIds.has(dep.predecessorId)) removeDependency(dep.id)
    }
    // Add new deps
    for (const predId of newPredIds) {
      if (!existingIds.has(predId)) {
        addDependency({ projectId, predecessorId: predId, successorId: taskId, type: 'FS', lagDays: 0 })
      }
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded focus:outline-none bg-white"
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setDraft(predWbs); setEditing(false); setError(null) }
        }}
        placeholder="e.g. 1.1, 1.2"
      />
    )
  }

  return (
    <div className="relative">
      <span
        className={clsx(
          'block px-1 py-0.5 text-xs cursor-text hover:bg-blue-50 rounded min-h-[20px]',
          predWbs ? 'text-slate-700' : 'text-slate-300',
          error && 'text-red-500',
        )}
        onDoubleClick={() => { setDraft(predWbs); setEditing(true) }}
        title={error || 'Double-click to edit predecessors (WBS numbers, comma-separated)'}
      >
        {error ? <AlertTriangle size={12} className="inline mr-0.5" /> : null}
        {predWbs || '—'}
      </span>
    </div>
  )
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  taskId, depth, isPhase, expanded, onToggle, selected, onSelect,
  projectId, wbsToId, idToWbs, computedWbs,
}: {
  taskId: string
  depth: number
  isPhase: boolean
  expanded: boolean
  onToggle: () => void
  selected: boolean
  onSelect: () => void
  projectId: string
  wbsToId: Record<string, string>
  idToWbs: Record<string, string>
  computedWbs: string
}) {
  const task = useStore(s => s.tasks[taskId])
  const schedule = useStore(s => s.schedule[taskId])
  const resources = useStore(s => s.resources)
  const updateTask = useStore(s => s.updateTask)

  if (!task) return null

  const assigneeName = task.assigneeIds.map(id => resources[id]?.name || '').filter(Boolean).join(', ')
  const isCritical = schedule?.isCritical ?? false

  const rowClass = clsx(
    'border-b border-slate-100 transition-colors',
    selected ? 'bg-blue-50 hover:bg-blue-50' : 'hover:bg-slate-50/70',
    isPhase && !selected && 'bg-indigo-50/60',
    isCritical && !isPhase && 'border-l-2 border-l-red-400',
    isPhase && 'border-l-4 border-l-indigo-500',
  )

  return (
    <tr className={rowClass} onClick={onSelect}>
      {/* WBS */}
      <td className="px-2 py-1 text-xs text-slate-400 w-16 whitespace-nowrap font-mono">
        {computedWbs}
      </td>

      {/* Name */}
      <td className="px-1 py-1" style={{ paddingLeft: 4 + depth * 20 }}>
        <div className="flex items-center gap-1 min-w-0">
          {task.isSummary ? (
            <button
              onClick={e => { e.stopPropagation(); onToggle() }}
              className="p-0.5 hover:bg-slate-200 rounded flex-shrink-0"
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : <span className="w-5 flex-shrink-0" />}

          {task.isMilestone && <Flag size={12} className="text-purple-500 flex-shrink-0" />}
          {isPhase && !task.isMilestone && <Layers size={12} className="text-indigo-500 flex-shrink-0" />}

          <EditableCell
            value={task.name}
            onSave={v => updateTask(taskId, { name: v })}
            className={clsx(
              'truncate',
              isPhase ? 'font-semibold text-slate-800' : task.isSummary ? 'font-medium' : '',
              isCritical && !isPhase ? 'text-red-600' : '',
            )}
            placeholder="Task name"
          />
        </div>
      </td>

      {/* Duration */}
      <td className="px-1 py-1 w-16">
        {!task.isMilestone && !task.isSummary ? (
          <EditableCell
            value={task.plannedDuration}
            type="number"
            onSave={v => updateTask(taskId, { plannedDuration: Math.max(1, parseInt(v) || 1) })}
          />
        ) : <span className="text-xs text-slate-400 px-1">—</span>}
      </td>

      {/* Start */}
      <td className="px-1 py-1 w-28">
        {!task.isSummary ? (
          <EditableCell
            value={schedule?.earlyStart || task.plannedStart}
            type="date"
            onSave={v => updateTask(taskId, { plannedStart: v, schedulingMode: 'manual' })}
          />
        ) : (
          <span className="text-xs text-slate-500 px-1">{schedule?.earlyStart || task.plannedStart}</span>
        )}
      </td>

      {/* Finish */}
      <td className="px-1 py-1 w-28">
        <span className="text-xs text-slate-600 px-1">{schedule?.earlyFinish || task.plannedEnd}</span>
      </td>

      {/* Predecessors */}
      <td className="px-1 py-1 w-28">
        {!task.isSummary && (
          <PredecessorsCell
            taskId={taskId}
            projectId={projectId}
            wbsToId={wbsToId}
            idToWbs={idToWbs}
          />
        )}
      </td>

      {/* % Complete */}
      <td className="px-1 py-1 w-20">
        <div className="flex items-center gap-1">
          <EditableCell
            value={task.percentComplete}
            type="number"
            onSave={v => updateTask(taskId, { percentComplete: Math.max(0, Math.min(100, parseInt(v) || 0)) })}
            className="w-10"
          />
          <span className="text-xs text-slate-400">%</span>
        </div>
      </td>

      {/* Status */}
      <td className="px-1 py-1 w-28">
        <StatusCell value={task.status} onChange={v => updateTask(taskId, { status: v })} />
      </td>

      {/* Assignee */}
      <td className="px-1 py-1 w-32">
        <span className="text-xs text-slate-600 px-1 truncate block">{assigneeName || '—'}</span>
      </td>

      {/* Budget */}
      <td className="px-1 py-1 w-24">
        <EditableCell
          value={task.budgetAmount}
          type="number"
          onSave={v => updateTask(taskId, { budgetAmount: parseFloat(v) || 0 })}
        />
      </td>

      {/* Actual */}
      <td className="px-1 py-1 w-24">
        <EditableCell
          value={task.actualCost}
          type="number"
          onSave={v => updateTask(taskId, { actualCost: parseFloat(v) || 0 })}
        />
      </td>

      {/* Float */}
      <td className="px-1 py-1 w-20 text-center">
        {schedule && !task.isSummary ? (
          <span className={clsx(
            'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium',
            isCritical ? 'bg-red-100 text-red-700' : 'text-slate-400',
          )}>
            {isCritical && <AlertTriangle size={10} />}
            {schedule.totalFloat}d
          </span>
        ) : '—'}
      </td>
    </tr>
  )
}

// ─── Critical path legend row ─────────────────────────────────────────────────

function CriticalPathLegend() {
  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-red-50 border-b border-red-100 text-xs text-red-700">
      <GitBranch size={12} />
      <span className="font-medium">Critical Path active</span>
      <span className="text-red-500">Tasks with 0 float are on the critical path — any delay extends the project end date.</span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TaskTablePage() {
  const { id: projectId } = useParams<{ id: string }>()
  const tasks = useStore(s => s.tasks)
  const scheduleError = useStore(s => s.scheduleError)
  const hasCritical = useStore(s =>
    projectId ? Object.values(s.schedule).some(sc =>
      sc.isCritical && s.tasks[sc.taskId]?.projectId === projectId && !s.tasks[sc.taskId]?.isSummary,
    ) : false,
  )

  const { createTask, deleteTask, indentTask, outdentTask, moveTask, loadTaskTemplate } = useStore(s => ({
    createTask: s.createTask,
    deleteTask: s.deleteTask,
    indentTask: s.indentTask,
    outdentTask: s.outdentTask,
    moveTask: s.moveTask,
    loadTaskTemplate: s.loadTaskTemplate,
  }))

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  // Compute fresh WBS every render
  const wbsMap = projectId ? computeWbsNumbers(tasks, projectId) : {}
  const wbsToId: Record<string, string> = {}
  const idToWbs: Record<string, string> = {}
  for (const [id, wbs] of Object.entries(wbsMap)) {
    wbsToId[wbs] = id
    idToWbs[id] = wbs
  }

  const orderedIds = projectId ? getOrderedTaskIds(tasks, projectId) : []

  const visibleIds = orderedIds.filter(id => {
    const task = tasks[id]
    if (!task) return false
    if (!task.parentId) return true
    let cur = tasks[task.parentId]
    while (cur) {
      if (!expanded.has(cur.id)) return false
      cur = cur.parentId ? tasks[cur.parentId] : undefined as any
    }
    return true
  })

  const toggleExpanded = (id: string) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  // Expand all phases on first load
  useEffect(() => {
    if (!projectId || orderedIds.length === 0) return
    const phases = orderedIds.filter(id => tasks[id]?.isSummary && !tasks[id]?.parentId)
    setExpanded(new Set(phases))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const addTask = (milestone = false) => {
    if (!projectId) return
    const parent = selectedId && tasks[selectedId]?.isSummary ? selectedId : null
    const id = createTask({
      projectId,
      name: milestone ? 'New Milestone' : 'New Task',
      isMilestone: milestone,
      parentId: parent,
    })
    if (parent) setExpanded(prev => new Set([...prev, parent]))
    setSelectedId(id)
  }

  const addPhase = () => {
    if (!projectId) return
    const id = createTask({ projectId, name: 'New Phase', isMilestone: false, parentId: null })
    setSelectedId(id)
  }

  const addSubtask = () => {
    if (!projectId || !selectedId) return
    const id = createTask({ projectId, name: 'New Subtask', parentId: selectedId })
    setExpanded(prev => new Set([...prev, selectedId]))
    setSelectedId(id)
  }

  const handleImportLibrary = (phases: LibraryPhase[]) => {
    if (!projectId) return
    loadTaskTemplate(projectId, phases)
    // Expand top-level phases
    setTimeout(() => {
      const newRoots = Object.values(tasks)
        .filter(t => t.projectId === projectId && t.parentId === null && t.isSummary)
        .map(t => t.id)
      setExpanded(new Set(newRoots))
    }, 50)
  }

  // Keyboard shortcuts: Tab/Shift-Tab demote/promote; Alt+↑/↓ move
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selectedId) return
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) outdentTask(selectedId)
      else indentTask(selectedId)
    } else if (e.key === 'ArrowUp' && e.altKey) {
      e.preventDefault()
      moveTask(selectedId, 'up')
    } else if (e.key === 'ArrowDown' && e.altKey) {
      e.preventDefault()
      moveTask(selectedId, 'down')
    } else if (e.key === 'ArrowUp' && !e.altKey && !e.ctrlKey && !e.metaKey) {
      // Navigate rows
      e.preventDefault()
      const idx = visibleIds.indexOf(selectedId)
      if (idx > 0) setSelectedId(visibleIds[idx - 1])
    } else if (e.key === 'ArrowDown' && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      const idx = visibleIds.indexOf(selectedId)
      if (idx < visibleIds.length - 1) setSelectedId(visibleIds[idx + 1])
    } else if (e.key === 'Delete') {
      setConfirmDelete(true)
    }
  }, [selectedId, visibleIds, indentTask, outdentTask, moveTask])

  const selectedTask = selectedId ? tasks[selectedId] : null

  return (
    <div className="flex flex-col h-full outline-none" tabIndex={-1} onKeyDown={handleKeyDown} ref={containerRef}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 bg-white flex-shrink-0 flex-wrap gap-y-1">
        {/* Add actions */}
        <Button size="sm" onClick={() => addPhase()} title="Add a top-level phase">
          <Layers size={14} className="mr-1" />Phase
        </Button>
        <Button size="sm" variant="outline" onClick={() => addTask()} title="Add a task (child of selected phase, or top-level)">
          <Plus size={14} className="mr-1" />Task
        </Button>
        <Button size="sm" variant="outline" onClick={addSubtask} disabled={!selectedId} title="Add a subtask under selected item">
          <IndentIncrease size={14} className="mr-1" />Subtask
        </Button>
        <Button size="sm" variant="outline" onClick={() => addTask(true)} title="Add a milestone">
          <Flag size={14} className="mr-1" />Milestone
        </Button>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* Hierarchy controls */}
        <Button
          size="sm" variant="ghost"
          onClick={() => selectedId && indentTask(selectedId)}
          disabled={!selectedId}
          title="Demote — make child of item above (Tab)"
        >
          <IndentIncrease size={14} />
          <span className="ml-1 text-xs hidden sm:inline">Demote</span>
        </Button>
        <Button
          size="sm" variant="ghost"
          onClick={() => selectedId && outdentTask(selectedId)}
          disabled={!selectedId}
          title="Promote — move up one level (Shift+Tab)"
        >
          <IndentDecrease size={14} />
          <span className="ml-1 text-xs hidden sm:inline">Promote</span>
        </Button>
        <Button
          size="sm" variant="ghost"
          onClick={() => selectedId && moveTask(selectedId, 'up')}
          disabled={!selectedId}
          title="Move up within siblings (Alt+↑)"
        >
          <ArrowUp size={14} />
        </Button>
        <Button
          size="sm" variant="ghost"
          onClick={() => selectedId && moveTask(selectedId, 'down')}
          disabled={!selectedId}
          title="Move down within siblings (Alt+↓)"
        >
          <ArrowDown size={14} />
        </Button>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        <Button
          size="sm" variant="ghost"
          className="text-red-600 hover:bg-red-50"
          onClick={() => selectedId && setConfirmDelete(true)}
          disabled={!selectedId}
          title="Delete selected item (Delete key)"
        >
          <Trash2 size={14} />
        </Button>

        <div className="flex-1" />

        {/* Right-side actions */}
        <Button size="sm" variant="outline" onClick={() => setShowLibrary(true)} title="Import template tasks from library">
          <BookOpen size={14} className="mr-1" />Library
        </Button>
        <Button size="sm" variant="outline" onClick={() => projectId && exportTasksCsv(tasks, projectId)}>
          <Download size={14} className="mr-1" />CSV
        </Button>
      </div>

      {/* Keyboard hint & schedule error */}
      {scheduleError && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-red-50 border-b border-red-200 text-xs text-red-700">
          <AlertTriangle size={12} />
          <span className="font-medium">Schedule error:</span> {scheduleError}
        </div>
      )}
      {hasCritical && !scheduleError && <CriticalPathLegend />}

      {/* Keyboard shortcuts hint */}
      <div className="px-4 py-1 border-b border-slate-100 bg-slate-50 text-xs text-slate-400 flex gap-4 flex-shrink-0">
        <span><kbd className="bg-white border border-slate-200 rounded px-1">Tab</kbd> Demote</span>
        <span><kbd className="bg-white border border-slate-200 rounded px-1">⇧Tab</kbd> Promote</span>
        <span><kbd className="bg-white border border-slate-200 rounded px-1">Alt+↑↓</kbd> Move</span>
        <span><kbd className="bg-white border border-slate-200 rounded px-1">↑↓</kbd> Navigate</span>
        <span className="hidden sm:inline"><kbd className="bg-white border border-slate-200 rounded px-1">Del</kbd> Delete</span>
        <span className="ml-auto text-slate-300">Double-click cells to edit · Double-click Predecessors to set dependencies by WBS</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {orderedIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Layers size={40} className="text-slate-200" />
            <p>No tasks yet. Start by adding a phase or importing from the library.</p>
            <div className="flex gap-2">
              <Button onClick={() => addPhase()}><Layers size={14} className="mr-1" />Add Phase</Button>
              <Button variant="outline" onClick={() => setShowLibrary(true)}><BookOpen size={14} className="mr-1" />Library</Button>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="px-2 py-2 text-left font-medium w-16">WBS</th>
                <th className="px-2 py-2 text-left font-medium">Name</th>
                <th className="px-2 py-2 text-left font-medium w-16">Days</th>
                <th className="px-2 py-2 text-left font-medium w-28">Start</th>
                <th className="px-2 py-2 text-left font-medium w-28">Finish</th>
                <th className="px-2 py-2 text-left font-medium w-28" title="Predecessor WBS numbers (double-click to edit)">Predecessors</th>
                <th className="px-2 py-2 text-left font-medium w-20">% Done</th>
                <th className="px-2 py-2 text-left font-medium w-28">Status</th>
                <th className="px-2 py-2 text-left font-medium w-32">Assignee</th>
                <th className="px-2 py-2 text-left font-medium w-24">Budget</th>
                <th className="px-2 py-2 text-left font-medium w-24">Actual</th>
                <th className="px-2 py-2 text-center font-medium w-20">Float</th>
              </tr>
            </thead>
            <tbody>
              {visibleIds.map(id => {
                const task = tasks[id]
                if (!task) return null
                const computedWbs = wbsMap[id] || ''
                const depth = computedWbs ? computedWbs.split('.').length - 1 : 0
                const isPhase = depth === 0 && !!task.isSummary
                return (
                  <TaskRow
                    key={id}
                    taskId={id}
                    depth={depth}
                    isPhase={isPhase}
                    expanded={expanded.has(id)}
                    onToggle={() => toggleExpanded(id)}
                    selected={selectedId === id}
                    onSelect={() => setSelectedId(id === selectedId ? null : id)}
                    projectId={projectId!}
                    wbsToId={wbsToId}
                    idToWbs={idToWbs}
                    computedWbs={computedWbs}
                  />
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Status bar */}
      {selectedTask && (
        <div className="flex items-center gap-3 px-4 py-1.5 border-t border-slate-200 bg-white text-xs text-slate-500 flex-shrink-0">
          <span className="font-medium text-slate-700">{idToWbs[selectedId!]} {selectedTask.name}</span>
          <span>·</span>
          <span>{selectedTask.isSummary ? 'Summary / Phase' : selectedTask.isMilestone ? 'Milestone' : 'Task'}</span>
          {!selectedTask.isMilestone && !selectedTask.isSummary && (
            <><span>·</span><span>{selectedTask.plannedDuration}d duration</span></>
          )}
          <span className="ml-auto text-slate-300">
            Tab/⇧Tab to promote/demote · Alt+↑↓ to reorder
          </span>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { if (selectedId) { deleteTask(selectedId); setSelectedId(null) } }}
        title="Delete Item"
        message="Are you sure? This will also delete all subtasks and their dependencies."
        confirmLabel="Delete"
        destructive
      />

      <TaskLibraryModal
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        onImport={handleImportLibrary}
      />
    </div>
  )
}
