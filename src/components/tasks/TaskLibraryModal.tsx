import React, { useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ENV_CONSULTANCY_LIBRARY, type LibraryPhase, type LibraryTask } from '@/data/envConsultancyLibrary'
import { ChevronRight, ChevronDown, Layers, CheckSquare, Square, Flag } from 'lucide-react'
import { clsx } from 'clsx'

interface Props {
  open: boolean
  onClose: () => void
  onImport: (phases: LibraryPhase[]) => void
}

export function TaskLibraryModal({ open, onClose, onImport }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]))

  const toggle = (i: number) => setSelected(prev => {
    const next = new Set(prev)
    next.has(i) ? next.delete(i) : next.add(i)
    return next
  })

  const toggleExpand = (i: number) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(i) ? next.delete(i) : next.add(i)
    return next
  })

  const handleImport = () => {
    onImport(ENV_CONSULTANCY_LIBRARY.filter((_, i) => selected.has(i)))
    onClose()
    setSelected(new Set())
  }

  return (
    <Dialog open={open} onClose={onClose} title="Task Library — Environmental Consultancy" className="w-full max-w-2xl mx-4">
      <p className="text-sm text-slate-500 mb-4">
        Select phases to add to your project. Tasks will be created with standard durations for a multidisciplinary environmental consultancy.
      </p>

      <div className="flex items-center gap-3 mb-3">
        <button className="text-xs text-blue-600 hover:underline" onClick={() => setSelected(new Set(ENV_CONSULTANCY_LIBRARY.map((_, i) => i)))}>
          Select all
        </button>
        <span className="text-slate-300">|</span>
        <button className="text-xs text-blue-600 hover:underline" onClick={() => setSelected(new Set())}>
          Clear
        </button>
        <span className="ml-auto text-xs text-slate-400">{selected.size} of {ENV_CONSULTANCY_LIBRARY.length} phases selected</span>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
        {ENV_CONSULTANCY_LIBRARY.map((phase, i) => (
          <div key={i}>
            <div
              className={clsx(
                'flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none',
                selected.has(i) ? 'bg-indigo-50' : 'bg-white hover:bg-slate-50',
              )}
            >
              <button
                onClick={() => toggle(i)}
                className="flex-shrink-0 text-slate-400 hover:text-indigo-600"
                aria-label={selected.has(i) ? 'Deselect phase' : 'Select phase'}
              >
                {selected.has(i)
                  ? <CheckSquare size={16} className="text-indigo-600" />
                  : <Square size={16} />}
              </button>
              <button onClick={() => toggleExpand(i)} className="flex-shrink-0 text-slate-400">
                {expanded.has(i) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <Layers size={14} className="flex-shrink-0 text-indigo-400" />
              <span className="font-medium text-sm text-slate-800">{phase.name}</span>
              {phase.description && (
                <span className="hidden sm:block text-xs text-slate-400 truncate ml-1 max-w-[240px]">— {phase.description}</span>
              )}
              <span className="ml-auto text-xs text-slate-400 whitespace-nowrap">{countTasks(phase.tasks)} items</span>
            </div>

            {expanded.has(i) && (
              <div className="bg-slate-50 border-t border-slate-100 pb-1">
                <TaskList tasks={phase.tasks} depth={0} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleImport} disabled={selected.size === 0}>
          Import {selected.size > 0 ? `${selected.size} phase${selected.size > 1 ? 's' : ''}` : 'phases'}
        </Button>
      </div>
    </Dialog>
  )
}

function countTasks(tasks: LibraryTask[]): number {
  return tasks.reduce((n, t) => n + 1 + (t.children ? countTasks(t.children) : 0), 0)
}

function TaskList({ tasks, depth }: { tasks: LibraryTask[]; depth: number }) {
  return (
    <>
      {tasks.map((task, i) => (
        <React.Fragment key={i}>
          <div
            className="flex items-center gap-2 py-1 text-xs text-slate-600"
            style={{ paddingLeft: 40 + depth * 16 }}
          >
            {task.isMilestone ? (
              <Flag size={11} className="flex-shrink-0 text-purple-500" />
            ) : task.children ? (
              <Layers size={11} className="flex-shrink-0 text-indigo-400" />
            ) : (
              <span className="w-[11px] flex-shrink-0 text-center text-slate-300">·</span>
            )}
            <span className={clsx(
              task.isMilestone && 'text-purple-600 font-medium',
              task.children && 'font-medium text-slate-700',
            )}>
              {task.name}
            </span>
            {!task.isMilestone && (
              <span className="ml-auto pr-4 text-slate-400">{task.duration}d</span>
            )}
          </div>
          {task.children && <TaskList tasks={task.children} depth={depth + 1} />}
        </React.Fragment>
      ))}
    </>
  )
}
