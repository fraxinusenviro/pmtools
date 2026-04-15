import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { calcBudgetSummary } from '@/engine/budgetCalculator'
import { getOrderedTaskIds } from '@/utils/wbsUtils'
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns'
import type { BudgetCategory } from '@/types'

const CATEGORY_OPTIONS: { value: BudgetCategory; label: string }[] = [
  { value: 'labor', label: 'Labor' },
  { value: 'materials', label: 'Materials' },
  { value: 'travel', label: 'Travel' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' },
]

export function BudgetPage() {
  const { id } = useParams<{ id: string }>()
  const {
    projects,
    tasks,
    actualCosts,
    createActualCost,
    deleteActualCost,
  } = useStore(s => ({
    projects: s.projects,
    tasks: s.tasks,
    actualCosts: s.actualCosts,
    createActualCost: s.createActualCost,
    deleteActualCost: s.deleteActualCost,
  }))

  const [addCostOpen, setAddCostOpen] = useState(false)
  const [deleteCostId, setDeleteCostId] = useState<string | null>(null)

  const project = id ? projects[id] : null
  if (!project) return null

  const budget = calcBudgetSummary(tasks, actualCosts, project.id)

  const projectActuals = Object.values(actualCosts)
    .filter(a => a.projectId === project.id)
    .sort((a, b) => a.date.localeCompare(b.date))

  const orderedTaskIds = getOrderedTaskIds(tasks, project.id)
  const projectTaskList = orderedTaskIds.map(tid => tasks[tid]).filter(Boolean)

  // Build monthly cumulative chart data
  const buildChartData = () => {
    if (!project.plannedStart || !project.plannedEnd) return []

    const months = eachMonthOfInterval({
      start: parseISO(project.plannedStart),
      end: parseISO(project.plannedEnd),
    })

    let cumulativeActual = 0

    return months.map(month => {
      const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd')
      const monthStart = format(startOfMonth(month), 'yyyy-MM-dd')

      // Planned: tasks ending in or before this month
      const plannedUpToMonth = projectTaskList
        .filter(t => !t.isMilestone && t.plannedEnd <= monthEnd)
        .reduce((s, t) => s + (t.budgetAmount || 0), 0)

      // Actual costs in this month
      const monthActual = projectActuals
        .filter(a => a.date >= monthStart && a.date <= monthEnd)
        .reduce((s, a) => s + a.amount, 0)

      cumulativeActual += monthActual

      return {
        month: format(month, 'MMM yyyy'),
        planned: Math.round(plannedUpToMonth),
        actual: Math.round(cumulativeActual),
      }
    })
  }

  const chartData = buildChartData()

  const summaryCards = [
    {
      label: 'Total Budget',
      value: `$${budget.planned.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Actual',
      value: `$${budget.actual.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-slate-700',
      bg: 'bg-slate-50',
    },
    {
      label: 'Variance',
      value: `${budget.variance < 0 ? '-' : '+'}$${Math.abs(budget.variance).toLocaleString()}`,
      icon: budget.variance < 0 ? AlertTriangle : TrendingDown,
      color: budget.variance < 0 ? 'text-red-600' : 'text-green-600',
      bg: budget.variance < 0 ? 'bg-red-50' : 'bg-green-50',
    },
    {
      label: 'Burn %',
      value: `${budget.burnPercent}%`,
      icon: TrendingUp,
      color: budget.isOverBudget ? 'text-red-600' : budget.isAtRisk ? 'text-amber-600' : 'text-blue-600',
      bg: budget.isOverBudget ? 'bg-red-50' : budget.isAtRisk ? 'bg-amber-50' : 'bg-blue-50',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Budget</h2>
        <Button onClick={() => setAddCostOpen(true)} size="sm">
          <Plus size={14} className="mr-1.5" /> Log Actual Cost
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-2`}>
                <Icon size={16} className={card.color} />
              </div>
              <p className="text-xs text-slate-500 mb-0.5">{card.label}</p>
              <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          )
        })}
      </div>

      {/* Cumulative chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Cumulative Planned vs Actual
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="planned"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Planned"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Actual"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Task budget table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">Task Budget Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Budget
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actual
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Variance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectTaskList
                .filter(t => !t.isMilestone && (t.budgetAmount > 0 || t.actualCost > 0))
                .map(t => {
                  const variance = t.budgetAmount - t.actualCost
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-700">
                        <span
                          style={{ paddingLeft: `${(t.parentId ? 1 : 0) * 16}px` }}
                          className="font-medium"
                        >
                          {t.wbsNumber && (
                            <span className="text-slate-400 mr-2">{t.wbsNumber}</span>
                          )}
                          {t.name}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700">
                        ${t.budgetAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700">
                        ${t.actualCost.toLocaleString()}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-medium ${
                          variance < 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {variance < 0 ? '-' : '+'}${Math.abs(variance).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              {projectTaskList.filter(
                t => !t.isMilestone && (t.budgetAmount > 0 || t.actualCost > 0)
              ).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">
                    No budget data. Add budgets to tasks in the task view.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
              <tr>
                <td className="px-4 py-2.5 font-semibold text-slate-700">Total</td>
                <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                  ${budget.planned.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                  ${budget.actual.toLocaleString()}
                </td>
                <td
                  className={`px-4 py-2.5 text-right font-semibold ${
                    budget.variance < 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {budget.variance < 0 ? '-' : '+'}$
                  {Math.abs(budget.variance).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Actual costs log */}
      {projectActuals.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">Actual Cost Log</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectActuals.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600">
                      {format(parseISO(a.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{a.description}</td>
                    <td className="px-4 py-2.5 text-slate-500 capitalize">{a.category}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                      ${a.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => setDeleteCostId(a.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Cost Modal */}
      <AddActualCostModal
        open={addCostOpen}
        onClose={() => setAddCostOpen(false)}
        projectId={project.id}
        tasks={projectTaskList}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteCostId !== null}
        onClose={() => setDeleteCostId(null)}
        onConfirm={() => {
          if (deleteCostId) deleteActualCost(deleteCostId)
        }}
        title="Delete Cost Entry"
        message="Are you sure you want to delete this cost entry? This action cannot be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  )
}

// ─── Add Actual Cost Modal ─────────────────────────────────────────────────────

interface AddCostModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  tasks: import('@/types').Task[]
}

function AddActualCostModal({ open, onClose, projectId, tasks }: AddCostModalProps) {
  const createActualCost = useStore(s => s.createActualCost)
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'other' as BudgetCategory,
    date: today,
    taskId: '',
  })

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim() || !form.amount) return
    createActualCost({
      projectId,
      taskId: form.taskId || undefined,
      category: form.category,
      description: form.description.trim(),
      amount: parseFloat(form.amount) || 0,
      date: form.date,
    })
    setForm({ description: '', amount: '', category: 'other', date: today, taskId: '' })
    onClose()
  }

  const taskOptions = [
    { value: '', label: 'No task (project-level)' },
    ...tasks
      .filter(t => !t.isMilestone)
      .map(t => ({ value: t.id, label: `${t.wbsNumber ? t.wbsNumber + ' ' : ''}${t.name}` })),
  ]

  return (
    <Dialog open={open} onClose={onClose} title="Log Actual Cost">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
          <Input
            value={form.description}
            onChange={e => update('description', e.target.value)}
            placeholder="e.g. Contractor invoice"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($) *</label>
            <Input
              type="number"
              value={form.amount}
              onChange={e => update('amount', e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <Input
              type="date"
              value={form.date}
              onChange={e => update('date', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <Select
            value={form.category}
            onChange={e => update('category', e.target.value)}
            options={CATEGORY_OPTIONS}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Link to Task (optional)
          </label>
          <Select
            value={form.taskId}
            onChange={e => update('taskId', e.target.value)}
            options={taskOptions}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={!form.description.trim() || !form.amount}
          >
            Log Cost
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
