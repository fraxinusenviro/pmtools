import React from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { clsx } from 'clsx'

const TABS = [
  { label: 'Overview', path: 'overview' },
  { label: 'Tasks', path: 'tasks' },
  { label: 'Gantt', path: 'gantt' },
  { label: 'Calendar', path: 'calendar' },
  { label: 'Budget', path: 'budget' },
  { label: 'Resources', path: 'resources' },
  { label: 'Reports', path: 'reports' },
]

export function ProjectTabBar() {
  const { id } = useParams()
  return (
    <div className="bg-white border-b border-slate-200 px-4 flex gap-0 overflow-x-auto flex-shrink-0">
      {TABS.map(tab => (
        <NavLink
          key={tab.path}
          to={`/projects/${id}/${tab.path}`}
          className={({ isActive }) =>
            clsx(
              'px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
              isActive
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  )
}
