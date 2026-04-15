import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'

export function TopBar() {
  const { projects, activeProjectId } = useStore(s => ({ projects: s.projects, activeProjectId: s.activeProjectId }))
  const navigate = useNavigate()
  const activeProject = activeProjectId ? projects[activeProjectId] : null

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center px-4 gap-4 flex-shrink-0">
      <Link to="/" className="font-bold text-blue-600 text-lg">PMTools</Link>
      <div className="h-5 w-px bg-slate-200" />
      {activeProject && (
        <span className="text-sm font-medium text-slate-700 truncate max-w-xs">{activeProject.name}</span>
      )}
      <div className="flex-1" />
      <Link to="/settings">
        <Button variant="ghost" size="icon"><Settings size={18} /></Button>
      </Link>
    </header>
  )
}
