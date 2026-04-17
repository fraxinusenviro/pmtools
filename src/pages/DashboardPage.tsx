import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FolderOpen, Calendar, DollarSign, TrendingUp } from 'lucide-react'
import { useStore } from '@/store'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { ProjectHealthBadge } from '@/components/shared/ProjectHealthBadge'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { NewProjectModal } from '@/components/dashboard/NewProjectModal'
import { calcProjectPercent } from '@/engine/progressCalculator'
import { calcBudgetSummary } from '@/engine/budgetCalculator'
import { format, parseISO } from 'date-fns'

export function DashboardPage() {
  const [showNew, setShowNew] = useState(false)
  const { projects, tasks, actualCosts, setActiveProject } = useStore(useShallow(s => ({
    projects: s.projects,
    tasks: s.tasks,
    actualCosts: s.actualCosts,
    setActiveProject: s.setActiveProject,
  })))

  const projectList = Object.values(projects).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm">
            {projectList.length} project{projectList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus size={16} className="mr-2" /> New Project
        </Button>
      </div>

      {projectList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FolderOpen size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-1">No projects yet</h3>
          <p className="text-slate-500 text-sm mb-4">Create your first project to get started.</p>
          <Button onClick={() => setShowNew(true)}>
            <Plus size={16} className="mr-2" /> New Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projectList.map(p => {
            const pct = calcProjectPercent(tasks, p.id)
            const budget = calcBudgetSummary(tasks, actualCosts, p.id)
            const milestones = Object.values(tasks)
              .filter(t => t.projectId === p.id && t.isMilestone && t.status !== 'completed')
              .sort((a, b) => a.plannedEnd.localeCompare(b.plannedEnd))
            const nextMilestone = milestones[0]

            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}/overview`}
                onClick={() => setActiveProject(p.id)}
                className="block bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 text-base leading-tight pr-2">
                    {p.name}
                  </h3>
                  <ProjectHealthBadge status={p.ragStatus} />
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progress</span>
                    <span>{pct}%</span>
                  </div>
                  <ProgressBar value={pct} color={pct >= 100 ? 'green' : 'blue'} />
                </div>

                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>
                      {format(parseISO(p.plannedStart), 'MMM d')} –{' '}
                      {format(parseISO(p.plannedEnd), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {budget.planned > 0 && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign size={12} />
                      <span>
                        ${budget.actual.toLocaleString()} / ${budget.planned.toLocaleString()}
                      </span>
                      {budget.isOverBudget && (
                        <span className="text-red-500 font-medium">Over budget</span>
                      )}
                    </div>
                  )}
                  {nextMilestone && (
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={12} />
                      <span>
                        Next: {nextMilestone.name} (
                        {format(parseISO(nextMilestone.plannedEnd), 'MMM d')})
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <NewProjectModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  )
}
