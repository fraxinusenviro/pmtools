import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { FolderOpen, Plus, BarChart2 } from 'lucide-react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { ProjectHealthBadge } from '@/components/shared/ProjectHealthBadge'
import { clsx } from 'clsx'

export function Sidebar() {
  const { id: activeId } = useParams()
  const projects = useStore(s => s.projects)
  const setActiveProject = useStore(s => s.setActiveProject)
  const projectList = Object.values(projects).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <aside className="w-56 bg-slate-900 text-slate-100 flex flex-col flex-shrink-0 h-full">
      <div className="p-4 border-b border-slate-700">
        <Link to="/" className="flex items-center gap-2 text-white font-bold text-base">
          <BarChart2 size={20} className="text-blue-400" />
          PMTools
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <Link to="/" className="flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-slate-700 text-slate-300 mb-2">
          Dashboard
        </Link>

        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1">Projects</div>

        {projectList.map(p => (
          <Link
            key={p.id}
            to={`/projects/${p.id}/overview`}
            onClick={() => setActiveProject(p.id)}
            className={clsx(
              'flex items-start gap-2 px-2 py-2 rounded-md text-sm hover:bg-slate-700 mb-0.5',
              activeId === p.id ? 'bg-slate-700 text-white' : 'text-slate-300'
            )}
          >
            <FolderOpen size={15} className="mt-0.5 flex-shrink-0" />
            <span className="truncate flex-1">{p.name}</span>
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-700">
        <Link to="/projects/new">
          <Button variant="outline" size="sm" className="w-full bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700">
            <Plus size={14} className="mr-1" /> New Project
          </Button>
        </Link>
      </div>
    </aside>
  )
}
