import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Edit2, Calendar, DollarSign, Users, Flag, CheckCircle } from 'lucide-react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { ProjectHealthBadge } from '@/components/shared/ProjectHealthBadge'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { ResourceAvatar } from '@/components/shared/ResourceAvatar'
import { calcProjectPercent } from '@/engine/progressCalculator'
import { calcBudgetSummary } from '@/engine/budgetCalculator'
import { format, parseISO } from 'date-fns'
import type { RAGStatus, ProjectStatus } from '@/types'

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const RAG_OPTIONS: { value: RAGStatus; label: string }[] = [
  { value: 'green', label: 'Green – On Track' },
  { value: 'amber', label: 'Amber – At Risk' },
  { value: 'red', label: 'Red – Off Track' },
]

const BUDGET_COLORS = ['#3b82f6', '#e2e8f0']

export function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const { projects, tasks, resources, assignments, actualCosts, updateProject } = useStore(s => ({
    projects: s.projects,
    tasks: s.tasks,
    resources: s.resources,
    assignments: s.assignments,
    actualCosts: s.actualCosts,
    updateProject: s.updateProject,
  }))

  const [editOpen, setEditOpen] = useState(false)

  const project = id ? projects[id] : null
  if (!project) return null

  const pct = calcProjectPercent(tasks, project.id)
  const budget = calcBudgetSummary(tasks, actualCosts, project.id)

  const projectTasks = Object.values(tasks).filter(t => t.projectId === project.id)
  const milestones = projectTasks
    .filter(t => t.isMilestone)
    .sort((a, b) => a.plannedEnd.localeCompare(b.plannedEnd))

  // Team members assigned to this project via assignments
  const assignedResourceIds = new Set(
    Object.values(assignments)
      .filter(a => a.projectId === project.id)
      .map(a => a.resourceId)
  )
  const teamResources = Array.from(assignedResourceIds)
    .map(rid => resources[rid])
    .filter(Boolean)

  const completedTasks = projectTasks.filter(t => t.status === 'completed').length
  const totalTasks = projectTasks.filter(t => !t.isMilestone && !t.isSummary).length

  const budgetChartData = [
    { name: 'Spent', value: Math.max(0, budget.actual) },
    { name: 'Remaining', value: Math.max(0, budget.planned - budget.actual) },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 truncate">{project.name}</h1>
            <ProjectHealthBadge status={project.ragStatus} />
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
              {project.status.replace('_', ' ')}
            </span>
          </div>
          {project.description && (
            <p className="text-slate-500 text-sm mt-1">{project.description}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="flex-shrink-0 ml-4">
          <Edit2 size={14} className="mr-1.5" /> Edit
        </Button>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
            <Calendar size={12} /> Timeline
          </div>
          <p className="text-sm font-medium text-slate-900">
            {format(parseISO(project.plannedStart), 'MMM d, yyyy')}
          </p>
          <p className="text-xs text-slate-500">
            to {format(parseISO(project.plannedEnd), 'MMM d, yyyy')}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
            <CheckCircle size={12} /> Tasks
          </div>
          <p className="text-2xl font-bold text-slate-900">{completedTasks}</p>
          <p className="text-xs text-slate-500">of {totalTasks} complete</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
            <Flag size={12} /> Milestones
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {milestones.filter(m => m.status === 'completed').length}
          </p>
          <p className="text-xs text-slate-500">of {milestones.length} complete</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
            <Users size={12} /> Team
          </div>
          <p className="text-2xl font-bold text-slate-900">{teamResources.length}</p>
          <p className="text-xs text-slate-500">member{teamResources.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Progress + Budget row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Progress */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Overall Progress</h3>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={pct >= 100 ? '#22c55e' : '#3b82f6'}
                  strokeWidth="3"
                  strokeDasharray={`${pct}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{pct}%</span>
                <span className="text-xs text-slate-500">complete</span>
              </div>
            </div>
          </div>
          <ProgressBar value={pct} color={pct >= 100 ? 'green' : 'blue'} showLabel />
        </div>

        {/* Budget */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Budget</h3>
          {budget.planned > 0 ? (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={budgetChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {budgetChartData.map((_, i) => (
                        <Cell key={i} fill={BUDGET_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-xs text-slate-500">Total Budget</p>
                  <p className="text-lg font-bold text-slate-900">
                    ${budget.planned.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Spent</p>
                  <p className={`text-base font-semibold ${budget.isOverBudget ? 'text-red-600' : 'text-slate-700'}`}>
                    ${budget.actual.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Remaining</p>
                  <p className={`text-sm font-medium ${budget.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${Math.abs(budget.variance).toLocaleString()} {budget.variance < 0 ? 'over' : 'left'}
                  </p>
                </div>
                <div className="mt-1">
                  <ProgressBar
                    value={budget.burnPercent}
                    color={budget.isOverBudget ? 'red' : budget.isAtRisk ? 'amber' : 'blue'}
                  />
                  <p className="text-xs text-slate-500 mt-0.5">{budget.burnPercent}% burned</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
              No budget set
            </div>
          )}
        </div>
      </div>

      {/* Milestones + Team */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Milestones */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Milestones</h3>
          {milestones.length === 0 ? (
            <p className="text-slate-400 text-sm">No milestones defined.</p>
          ) : (
            <div className="space-y-2">
              {milestones.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      m.status === 'completed'
                        ? 'bg-green-500'
                        : m.plannedEnd < new Date().toISOString().slice(0, 10)
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${m.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {m.name}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {format(parseISO(m.plannedEnd), 'MMM d, yyyy')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Team Members</h3>
          {teamResources.length === 0 ? (
            <p className="text-slate-400 text-sm">No team members assigned.</p>
          ) : (
            <div className="space-y-2">
              {teamResources.map(r => {
                const memberAssignments = Object.values(assignments).filter(
                  a => a.projectId === project.id && a.resourceId === r.id
                )
                const avgAlloc =
                  memberAssignments.length > 0
                    ? Math.round(
                        memberAssignments.reduce((s, a) => s + a.allocationPercent, 0) /
                          memberAssignments.length
                      )
                    : 0
                return (
                  <div key={r.id} className="flex items-center gap-3">
                    <ResourceAvatar resource={r} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{r.name}</p>
                      {r.role && <p className="text-xs text-slate-500">{r.role}</p>}
                    </div>
                    <span className="text-xs text-slate-500">{avgAlloc}% alloc</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <EditProjectModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        projectId={project.id}
      />
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  open: boolean
  onClose: () => void
  projectId: string
}

function EditProjectModal({ open, onClose, projectId }: EditModalProps) {
  const { projects, updateProject } = useStore(s => ({
    projects: s.projects,
    updateProject: s.updateProject,
  }))
  const project = projects[projectId]

  const [form, setForm] = useState(() =>
    project
      ? {
          name: project.name,
          description: project.description || '',
          plannedStart: project.plannedStart,
          plannedEnd: project.plannedEnd,
          budgetTotal: String(project.budgetTotal),
          status: project.status,
          ragStatus: project.ragStatus,
          sponsor: project.sponsor || '',
          owner: project.owner || '',
        }
      : {
          name: '',
          description: '',
          plannedStart: '',
          plannedEnd: '',
          budgetTotal: '0',
          status: 'planning' as ProjectStatus,
          ragStatus: 'green' as RAGStatus,
          sponsor: '',
          owner: '',
        }
  )

  if (!project) return null

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    updateProject(projectId, {
      name: form.name.trim(),
      description: form.description,
      plannedStart: form.plannedStart,
      plannedEnd: form.plannedEnd,
      budgetTotal: parseFloat(form.budgetTotal) || 0,
      status: form.status as ProjectStatus,
      ragStatus: form.ragStatus as RAGStatus,
      sponsor: form.sponsor || undefined,
      owner: form.owner || undefined,
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Edit Project" className="w-full max-w-lg mx-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Project Name *</label>
          <Input value={form.name} onChange={e => update('name', e.target.value)} autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <Textarea
            value={form.description}
            onChange={e => update('description', e.target.value)}
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <Input
              type="date"
              value={form.plannedStart}
              onChange={e => update('plannedStart', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
            <Input
              type="date"
              value={form.plannedEnd}
              onChange={e => update('plannedEnd', e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <Select
              value={form.status}
              onChange={e => update('status', e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Health</label>
            <Select
              value={form.ragStatus}
              onChange={e => update('ragStatus', e.target.value)}
              options={RAG_OPTIONS}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Budget ($)</label>
          <Input
            type="number"
            value={form.budgetTotal}
            onChange={e => update('budgetTotal', e.target.value)}
            min="0"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sponsor</label>
            <Input
              value={form.sponsor}
              onChange={e => update('sponsor', e.target.value)}
              placeholder="Sponsor name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Owner</label>
            <Input
              value={form.owner}
              onChange={e => update('owner', e.target.value)}
              placeholder="Owner name"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={!form.name.trim()}>
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
