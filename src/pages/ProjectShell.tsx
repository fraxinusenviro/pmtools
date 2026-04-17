import React, { useEffect } from 'react'
import { Outlet, useParams, useNavigate } from 'react-router-dom'
import { ProjectTabBar } from '@/components/layout/ProjectTabBar'
import { useStore } from '@/store'
import { useShallow } from 'zustand/react/shallow'

export function ProjectShell() {
  const { id } = useParams<{ id: string }>()
  const { projects, setActiveProject } = useStore(useShallow(s => ({
    projects: s.projects,
    setActiveProject: s.setActiveProject,
  })))

  useEffect(() => {
    if (id) setActiveProject(id)
  }, [id, setActiveProject])

  const project = id ? projects[id] : null
  if (!project) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Project not found.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ProjectTabBar />
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
