import React, { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from '@/store'
import { useShallow } from 'zustand/react/shallow'
import { getOrderedTaskIds } from '@/utils/wbsUtils'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Plus, Trash2, ChevronRight, ChevronDown, ArrowUp, ArrowDown, IndentIncrease, IndentDecrease, Flag, Download } from 'lucide-react'
import { clsx } from 'clsx'
import type { Task, TaskStatus } from '@/types'
import { exportTasksCsv } from '@/export/exportCsv'

// ─── Inline editable cell ─────────────────────────────────────────────────────

function EditableCell({
  value, onSave, type = 'text', className, placeholder
}: {
  value: string | number; onSave: (v: string) => void; type?: string; className?: string; placeholder?: string
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
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(String(value)); setEditing(false) } }}
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
      {value === '' || value === 0 && type === 'number' ? (
        <span className="text-slate-400">{placeholder || '—'}</span>
      ) : String(value)}
    </span>
  )
}

// ─── Status select cell ────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'not_started', label: 'Not Started', color: 'bg-slate-100 text-slate-600' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'completed', label: 'Complete', color: 'bg-green-100 text-green-700' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-orange-100 text-orange-700' },
]

function StatusCell({ value, onChange }: { value: TaskStatus; onChange: (v: TaskStatus) => void }) {
  const opt = STATUS_OPTIONS.find(o => o.value === value) || STATUS_OPTIONS[0]
  return (
    <select
      className={clsx('text-xs rounded px-1 py-0.5 border-0 cursor-pointer font-medium', opt.color)}
      value={value}
      onChange={e => onChange(e.target.value as TaskStatus)}
    >
      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  taskId, depth, expanded, onToggle, selected, onSelect
}: {
  taskId: string; depth: number; expanded: boolean; onToggle: () => void; selected: boolean; onSelect: () => void
}) {
  const task = useStore(s => s.tasks[taskId])
  const schedule = useStore(s => s.schedule[taskId])
  const resources = useStore(s => s.resources)
  const updateTask = useStore(s => s.updateTask)

  if (!task) return null

  const assigneeName = task.assigneeIds.map(id => resources[id]?.name || '').filter(Boolean).join(', ')

  return (
    <tr
      className={clsx('border-b border-slate-100 hover:bg-slate-50', selected && 'bg-blue-50 hover:bg-blue-50', task.isSummary && 'bg-slate-50')}
      onClick={onSelect}
    >
      {/* WBS */}
      <td className="px-2 py-1 text-xs text-slate-400 w-16 whitespace-nowrap">{task.wbsNumber}</td>

      {/* Name */}
      <td className="px-1 py-1" style={{ paddingLeft: 8 + depth * 20 }}>
        <div className="flex items-center gap-1 min-w-0">
          {task.isSummary ? (
            <button onClick={e => { e.stopPropagation(); onToggle() }} className="p-0.5 hover:bg-slate-200 rounded flex-shrink-0">
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : <span className="w-5 flex-shrink-0" />}
          {task.isMilestone && <Flag size={12} className="text-purple-500 flex-shrink-0" />}
          <EditableCell
            value={task.name}
            onSave={v => updateTask(taskId, { name: v })}
            className={clsx('truncate', task.isSummary ? 'font-semibold' : '', schedule?.isCritical ? 'text-red-600' : '')}
            placeholder="Task name"
          />
        </div>
      </td>

      {/* Duration */}
      <td className="px-1 py-1 w-20">
        {!task.isMilestone ? (
          <EditableCell value={task.plannedDuration} type="number" onSave={v => updateTask(taskId, { plannedDuration: Math.max(1, parseInt(v) || 1) })} />
        ) : <span className="text-xs text-slate-400 px-1">—</span>}
      </td>

      {/* Start */}
      <td className="px-1 py-1 w-28">
        <EditableCell value={schedule?.earlyStart || task.plannedStart} type="date" onSave={v => updateTask(taskId, { plannedStart: v, schedulingMode: 'manual' })} />
      </td>

      {/* Finish */}
      <td className="px-1 py-1 w-28">
        <span className="text-xs text-slate-600 px-1">{schedule?.earlyFinish || task.plannedEnd}</span>
      </td>

      {/* % Complete */}
      <td className="px-1 py-1 w-24">
        <div className="flex items-center gap-1">
          <EditableCell value={task.percentComplete} type="number" onSave={v => updateTask(taskId, { percentComplete: Math.max(0, Math.min(100, parseInt(v) || 0)) })} className="w-12" />
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
        <EditableCell value={task.budgetAmount} type="number" onSave={v => updateTask(taskId, { budgetAmount: parseFloat(v) || 0 })} />
      </td>

      {/* Actual */}
      <td className="px-1 py-1 w-24">
        <EditableCell value={task.actualCost} type="number" onSave={v => updateTask(taskId, { actualCost: parseFloat(v) || 0 })} />
      </td>

      {/* Float */}
      <td className="px-1 py-1 w-16 text-xs text-center">
        {schedule ? (
          <span className={clsx('px-1 rounded text-xs', schedule.isCritical ? 'bg-red-100 text-red-700 font-medium' : 'text-slate-400')}>
            {schedule.totalFloat}d
          </span>
        ) : '—'}
      </td>
    </tr>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TaskTablePage() {
  const { id: projectId } = useParams<{ id: string }>()
  const tasks = useStore(s => s.tasks)
  const { createTask, deleteTask, indentTask, outdentTask, moveTask } = useStore(useShallow(s => ({
    createTask: s.createTask, deleteTask: s.deleteTask,
    indentTask: s.indentTask, outdentTask: s.outdentTask, moveTask: s.moveTask,
  })))

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const orderedIds = projectId ? getOrderedTaskIds(tasks, projectId) : []

  // Filter based on expanded state
  const visibleIds = orderedIds.filter(id => {
    const task = tasks[id]
    if (!task) return false
    if (!task.parentId) return true
    // Check all ancestors are expanded
    let cur = tasks[task.parentId]
    while (cur) {
      if (!expanded.has(cur.id)) return false
      cur = cur.parentId ? tasks[cur.parentId] : undefined as any
    }
    return true
  })

  const toggleExpanded = (id: string) => setExpanded(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const addTask = (milestone = false) => {
    if (!projectId) return
    const id = createTask({
      projectId, name: milestone ? 'New Milestone' : 'New Task',
      isMilestone: milestone,
      parentId: selectedId && tasks[selectedId]?.isSummary ? selectedId : null,
    })
    if (selectedId && tasks[selectedId]?.isSummary) {
      setExpanded(prev => new Set([...prev, selectedId]))
    }
    setSelectedId(id)
  }

  const addSubtask = () => {
    if (!projectId || !selectedId) return
    const id = createTask({ projectId, name: 'New Subtask', parentId: selectedId })
    setExpanded(prev => new Set([...prev, selectedId]))
    setSelectedId(id)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 bg-white flex-shrink-0 flex-wrap">
        <Button size="sm" onClick={() => addTask()}><Plus size={14} className="mr-1" />Task</Button>
        <Button size="sm" variant="outline" onClick={() => addTask(true)}><Flag size={14} className="mr-1" />Milestone</Button>
        <Button size="sm" variant="outline" onClick={addSubtask} disabled={!selectedId}><IndentIncrease size={14} className="mr-1" />Subtask</Button>
        <div className="h-5 w-px bg-slate-200 mx-1" />
        <Button size="sm" variant="ghost" onClick={() => selectedId && indentTask(selectedId)} disabled={!selectedId} title="Indent"><IndentIncrease size={14} /></Button>
        <Button size="sm" variant="ghost" onClick={() => selectedId && outdentTask(selectedId)} disabled={!selectedId} title="Outdent"><IndentDecrease size={14} /></Button>
        <Button size="sm" variant="ghost" onClick={() => selectedId && moveTask(selectedId, 'up')} disabled={!selectedId} title="Move up"><ArrowUp size={14} /></Button>
        <Button size="sm" variant="ghost" onClick={() => selectedId && moveTask(selectedId, 'down')} disabled={!selectedId} title="Move down"><ArrowDown size={14} /></Button>
        <div className="h-5 w-px bg-slate-200 mx-1" />
        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => selectedId && setConfirmDelete(true)} disabled={!selectedId}>
          <Trash2 size={14} />
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => projectId && exportTasksCsv(tasks, projectId)}>
          <Download size={14} className="mr-1" />CSV
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {orderedIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <p className="mb-3">No tasks yet.</p>
            <Button onClick={() => addTask()}><Plus size={14} className="mr-1" />Add First Task</Button>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-2 py-2 text-left font-medium w-16">WBS</th>
                <th className="px-2 py-2 text-left font-medium">Name</th>
                <th className="px-2 py-2 text-left font-medium w-20">Days</th>
                <th className="px-2 py-2 text-left font-medium w-28">Start</th>
                <th className="px-2 py-2 text-left font-medium w-28">Finish</th>
                <th className="px-2 py-2 text-left font-medium w-24">% Done</th>
                <th className="px-2 py-2 text-left font-medium w-28">Status</th>
                <th className="px-2 py-2 text-left font-medium w-32">Assignee</th>
                <th className="px-2 py-2 text-left font-medium w-24">Budget</th>
                <th className="px-2 py-2 text-left font-medium w-24">Actual</th>
                <th className="px-2 py-2 text-center font-medium w-16">Float</th>
              </tr>
            </thead>
            <tbody>
              {visibleIds.map(id => {
                const task = tasks[id]
                if (!task) return null
                const depth = (task.wbsNumber?.split('.').length || 1) - 1
                return (
                  <TaskRow
                    key={id}
                    taskId={id}
                    depth={depth}
                    expanded={expanded.has(id)}
                    onToggle={() => toggleExpanded(id)}
                    selected={selectedId === id}
                    onSelect={() => setSelectedId(id === selectedId ? null : id)}
                  />
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { if (selectedId) { deleteTask(selectedId); setSelectedId(null) } }}
        title="Delete Task"
        message="Are you sure? This will also delete all subtasks and dependencies."
        confirmLabel="Delete"
        destructive
      />
    </div>
  )
}
