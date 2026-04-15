import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ResourceAvatar } from '@/components/shared/ResourceAvatar'
import type { Resource, ResourceType } from '@/types'

const RESOURCE_TYPE_OPTIONS: { value: ResourceType; label: string }[] = [
  { value: 'person', label: 'Person' },
  { value: 'role', label: 'Role' },
  { value: 'equipment', label: 'Equipment' },
]

const COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899',
]

interface ResourceFormState {
  name: string
  email: string
  role: string
  type: ResourceType
  dailyCapacityHours: string
  costPerHour: string
  color: string
}

const defaultForm = (): ResourceFormState => ({
  name: '',
  email: '',
  role: '',
  type: 'person',
  dailyCapacityHours: '8',
  costPerHour: '',
  color: COLORS[Math.floor(Math.random() * COLORS.length)],
})

export function ResourcesPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const {
    resources,
    assignments,
    tasks,
    createResource,
    updateResource,
    deleteResource,
    createAssignment,
    deleteAssignment,
  } = useStore(s => ({
    resources: s.resources,
    assignments: s.assignments,
    tasks: s.tasks,
    createResource: s.createResource,
    updateResource: s.updateResource,
    deleteResource: s.deleteResource,
    createAssignment: s.createAssignment,
    deleteAssignment: s.deleteAssignment,
  }))

  const [addResourceOpen, setAddResourceOpen] = useState(false)
  const [editResource, setEditResource] = useState<Resource | null>(null)
  const [deleteResourceId, setDeleteResourceId] = useState<string | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)

  const projectAssignments = Object.values(assignments).filter(
    a => a.projectId === projectId
  )

  // Resources assigned to this project
  const assignedResourceIds = new Set(projectAssignments.map(a => a.resourceId))
  const projectResources = Array.from(assignedResourceIds)
    .map(rid => resources[rid])
    .filter(Boolean)

  // All resources for assignment picker
  const allResources = Object.values(resources)

  const projectTasks = Object.values(tasks).filter(
    t => t.projectId === projectId && !t.isMilestone
  )

  const getResourceAllocation = (resourceId: string) => {
    const ra = projectAssignments.filter(a => a.resourceId === resourceId)
    if (ra.length === 0) return 0
    return Math.round(ra.reduce((s, a) => s + a.allocationPercent, 0) / ra.length)
  }

  const getResourceTaskCount = (resourceId: string) =>
    projectAssignments.filter(a => a.resourceId === resourceId).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Resources</h2>
          <p className="text-slate-500 text-sm">
            {projectResources.length} team member{projectResources.length !== 1 ? 's' : ''} on
            this project
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
            <UserPlus size={14} className="mr-1.5" /> Assign to Project
          </Button>
          <Button size="sm" onClick={() => setAddResourceOpen(true)}>
            <Plus size={14} className="mr-1.5" /> New Resource
          </Button>
        </div>
      </div>

      {/* Resource cards */}
      {projectResources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-200">
          <UserPlus size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium mb-1">No team members yet</p>
          <p className="text-slate-400 text-sm mb-4">
            Create a resource and assign them to this project.
          </p>
          <Button size="sm" onClick={() => setAddResourceOpen(true)}>
            <Plus size={14} className="mr-1.5" /> New Resource
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projectResources.map(r => {
            const allocation = getResourceAllocation(r.id)
            const taskCount = getResourceTaskCount(r.id)

            return (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <ResourceAvatar resource={r} size="lg" />
                    <div>
                      <p className="font-semibold text-slate-900">{r.name}</p>
                      {r.role && <p className="text-xs text-slate-500">{r.role}</p>}
                      {r.email && <p className="text-xs text-slate-400">{r.email}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditResource(r)}
                      className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteResourceId(r.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-xs text-slate-500">Allocation</p>
                    <p
                      className={`text-base font-bold ${
                        allocation > 100 ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {allocation}%
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-xs text-slate-500">Tasks</p>
                    <p className="text-base font-bold text-slate-900">{taskCount}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-xs text-slate-500">Hrs/Day</p>
                    <p className="text-base font-bold text-slate-900">{r.dailyCapacityHours}</p>
                  </div>
                </div>

                {r.costPerHour && r.costPerHour > 0 && (
                  <p className="text-xs text-slate-500">
                    Rate: ${r.costPerHour}/hr
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Assignments table */}
      {projectAssignments.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">Assignments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Allocation
                  </th>
                  <th className="px-4 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectAssignments.map(a => {
                  const resource = resources[a.resourceId]
                  const task = tasks[a.taskId]
                  if (!resource || !task) return null
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <ResourceAvatar resource={resource} size="sm" />
                          <span className="text-slate-700 font-medium">{resource.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{task.name}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">
                        {a.allocationPercent}%
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => deleteAssignment(a.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <ResourceFormModal
        open={addResourceOpen}
        onClose={() => setAddResourceOpen(false)}
        onSave={data => {
          createResource(data)
          setAddResourceOpen(false)
        }}
        title="New Resource"
      />

      {editResource && (
        <ResourceFormModal
          open={!!editResource}
          onClose={() => setEditResource(null)}
          onSave={data => {
            updateResource(editResource.id, data)
            setEditResource(null)
          }}
          title="Edit Resource"
          initial={editResource}
        />
      )}

      <ConfirmDialog
        open={deleteResourceId !== null}
        onClose={() => setDeleteResourceId(null)}
        onConfirm={() => {
          if (deleteResourceId) deleteResource(deleteResourceId)
        }}
        title="Delete Resource"
        message="This will remove the resource and all their assignments. This cannot be undone."
        confirmLabel="Delete"
        destructive
      />

      {projectId && (
        <AssignResourceModal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          projectId={projectId}
          allResources={allResources}
          projectTasks={projectTasks}
          existingAssignments={projectAssignments}
          onAssign={(resourceId, taskId, allocation) => {
            createAssignment({ projectId, taskId, resourceId, allocationPercent: allocation })
          }}
        />
      )}
    </div>
  )
}

// ─── Resource Form Modal ──────────────────────────────────────────────────────

interface ResourceFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Resource, 'id' | 'createdAt'>) => void
  title: string
  initial?: Resource
}

function ResourceFormModal({ open, onClose, onSave, title, initial }: ResourceFormModalProps) {
  const [form, setForm] = useState<ResourceFormState>(
    initial
      ? {
          name: initial.name,
          email: initial.email || '',
          role: initial.role || '',
          type: initial.type,
          dailyCapacityHours: String(initial.dailyCapacityHours),
          costPerHour: initial.costPerHour ? String(initial.costPerHour) : '',
          color: initial.color || COLORS[0],
        }
      : defaultForm()
  )

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave({
      name: form.name.trim(),
      email: form.email || undefined,
      role: form.role || undefined,
      type: form.type,
      dailyCapacityHours: parseFloat(form.dailyCapacityHours) || 8,
      costPerHour: form.costPerHour ? parseFloat(form.costPerHour) : undefined,
      color: form.color,
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <Input
            value={form.name}
            onChange={e => update('name', e.target.value)}
            placeholder="e.g. Jane Smith"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <Input
              value={form.role}
              onChange={e => update('role', e.target.value)}
              placeholder="e.g. Developer"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <Select
              value={form.type}
              onChange={e => update('type', e.target.value)}
              options={RESOURCE_TYPE_OPTIONS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hrs/Day</label>
            <Input
              type="number"
              value={form.dailyCapacityHours}
              onChange={e => update('dailyCapacityHours', e.target.value)}
              min="1"
              max="24"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Cost/Hour ($)
            </label>
            <Input
              type="number"
              value={form.costPerHour}
              onChange={e => update('costPerHour', e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
            <div className="flex gap-1.5 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update('color', c)}
                  className={`w-6 h-6 rounded-full border-2 ${
                    form.color === c ? 'border-slate-800 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={!form.name.trim()}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

// ─── Assign Resource Modal ────────────────────────────────────────────────────

interface AssignResourceModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  allResources: Resource[]
  projectTasks: import('@/types').Task[]
  existingAssignments: import('@/types').Assignment[]
  onAssign: (resourceId: string, taskId: string, allocation: number) => void
}

function AssignResourceModal({
  open,
  onClose,
  projectId,
  allResources,
  projectTasks,
  existingAssignments,
  onAssign,
}: AssignResourceModalProps) {
  const [form, setForm] = useState({
    resourceId: '',
    taskId: '',
    allocationPercent: '100',
  })

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.resourceId || !form.taskId) return
    onAssign(form.resourceId, form.taskId, parseInt(form.allocationPercent, 10) || 100)
    setForm({ resourceId: '', taskId: '', allocationPercent: '100' })
    onClose()
  }

  const resourceOptions = allResources.map(r => ({ value: r.id, label: r.name }))
  const taskOptions = projectTasks
    .filter(t => !t.isSummary)
    .map(t => ({
      value: t.id,
      label: `${t.wbsNumber ? t.wbsNumber + ' ' : ''}${t.name}`,
    }))

  return (
    <Dialog open={open} onClose={onClose} title="Assign Resource to Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Resource *</label>
          <Select
            value={form.resourceId}
            onChange={e => update('resourceId', e.target.value)}
            options={resourceOptions}
            placeholder="Select a resource..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Task *</label>
          <Select
            value={form.taskId}
            onChange={e => update('taskId', e.target.value)}
            options={taskOptions}
            placeholder="Select a task..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Allocation %</label>
          <Input
            type="number"
            value={form.allocationPercent}
            onChange={e => update('allocationPercent', e.target.value)}
            min="1"
            max="200"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={!form.resourceId || !form.taskId}
          >
            Assign
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
