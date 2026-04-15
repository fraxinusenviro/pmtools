import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/store'

interface Props {
  open: boolean
  onClose: () => void
}

export function NewProjectModal({ open, onClose }: Props) {
  const navigate = useNavigate()
  const createProject = useStore(s => s.createProject)
  const setActiveProject = useStore(s => s.setActiveProject)
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    name: '',
    description: '',
    plannedStart: today,
    plannedEnd: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    budgetTotal: '',
  })

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const id = createProject({
      name: form.name.trim(),
      description: form.description,
      status: 'planning',
      ragStatus: 'green',
      plannedStart: form.plannedStart,
      plannedEnd: form.plannedEnd,
      budgetTotal: parseFloat(form.budgetTotal) || 0,
      workingDays: [1, 2, 3, 4, 5],
      holidays: [],
      hoursPerDay: 8,
    })
    setActiveProject(id)
    onClose()
    setForm({
      name: '',
      description: '',
      plannedStart: today,
      plannedEnd: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      budgetTotal: '',
    })
    navigate(`/projects/${id}/overview`)
  }

  return (
    <Dialog open={open} onClose={onClose} title="New Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Project Name *</label>
          <Input
            value={form.name}
            onChange={e => update('name', e.target.value)}
            placeholder="e.g. Website Redesign"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <Textarea
            value={form.description}
            onChange={e => update('description', e.target.value)}
            placeholder="What is this project about?"
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
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Budget ($)</label>
          <Input
            type="number"
            value={form.budgetTotal}
            onChange={e => update('budgetTotal', e.target.value)}
            placeholder="0"
            min="0"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={!form.name.trim()}>
            Create Project
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
