import React, { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from '@/store'
import { calcProjectPercent } from '@/engine/progressCalculator'
import { calcBudgetSummary } from '@/engine/budgetCalculator'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ProjectHealthBadge } from '@/components/shared/ProjectHealthBadge'
import { format, parseISO } from 'date-fns'
import { FileText, Download, AlertTriangle, TrendingUp, CheckSquare } from 'lucide-react'
import type { RAGStatus, TaskStatus } from '@/types'
import { downloadText } from '@/export/exportCsv'

type ReportType = 'status' | 'critical-path' | 'budget-summary'

const RAG_OPTIONS = [
  { value: 'green', label: 'Green – On Track' },
  { value: 'amber', label: 'Amber – At Risk' },
  { value: 'red', label: 'Red – Off Track' },
]

const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: 'Not Started', in_progress: 'In Progress',
  completed: 'Complete', on_hold: 'On Hold',
}

export function ReportsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const project = useStore(s => projectId ? s.projects[projectId] : null)
  const tasks = useStore(s => s.tasks)
  const schedule = useStore(s => s.schedule)
  const actualCosts = useStore(s => s.actualCosts)
  const createStatusReport = useStore(s => s.createStatusReport)
  const statusReports = useStore(s => s.statusReports)

  const [reportType, setReportType] = useState<ReportType>('status')
  const [saved, setSaved] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    reportDate: new Date().toISOString().slice(0, 10),
    overallStatus: 'green' as RAGStatus,
    scopeNarrative: '',
    scheduleNarrative: '',
    budgetNarrative: '',
    risksNarrative: '',
    nextStepsNarrative: '',
  })

  if (!projectId || !project) return <div className="p-6 text-slate-500">Project not found.</div>

  const pct = calcProjectPercent(tasks, projectId)
  const budget = calcBudgetSummary(tasks, actualCosts, projectId)
  const milestones = Object.values(tasks).filter(t => t.projectId === projectId && t.isMilestone).sort((a, b) => a.plannedEnd.localeCompare(b.plannedEnd))
  const criticalTasks = Object.values(tasks).filter(t => t.projectId === projectId && !t.isSummary && schedule[t.id]?.isCritical)
  const projectTasks = Object.values(tasks).filter(t => t.projectId === projectId)

  const handleSaveReport = () => {
    createStatusReport({
      projectId,
      reportDate: form.reportDate,
      overallStatus: form.overallStatus,
      percentCompleteSnapshot: pct,
      scopeNarrative: form.scopeNarrative,
      scheduleNarrative: form.scheduleNarrative,
      budgetNarrative: form.budgetNarrative,
      risksNarrative: form.risksNarrative,
      nextStepsNarrative: form.nextStepsNarrative,
      milestoneSnapshot: milestones.map(m => ({
        taskId: m.id, name: m.name, plannedDate: m.plannedEnd, status: m.status,
      })),
      budgetSnapshot: { planned: budget.planned, actual: budget.actual, variance: budget.variance },
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handlePrint = () => window.print()

  const exportCriticalPathCsv = () => {
    const rows = [
      ['Task', 'WBS', 'Start', 'Finish', 'Duration', 'Float'],
      ...criticalTasks.map(t => {
        const s = schedule[t.id]
        return [t.name, t.wbsNumber || '', s?.earlyStart || '', s?.earlyFinish || '', t.plannedDuration, s?.totalFloat || 0]
      })
    ]
    downloadText(rows.map(r => r.join(',')).join('\n'), 'critical-path.csv', 'text/csv')
  }

  return (
    <div className="flex h-full">
      {/* Left: Report picker */}
      <div className="w-52 flex-shrink-0 bg-slate-50 border-r border-slate-200 p-4 space-y-1">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Reports</p>
        {([
          { key: 'status', label: 'Status Report', icon: FileText },
          { key: 'critical-path', label: 'Critical Path', icon: AlertTriangle },
          { key: 'budget-summary', label: 'Budget Summary', icon: TrendingUp },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setReportType(key)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${reportType === key ? 'bg-white shadow-sm border border-slate-200 text-blue-600 font-medium' : 'text-slate-600 hover:bg-white'}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Right: Report preview */}
      <div className="flex-1 overflow-auto p-6">
        {/* ── Status Report ── */}
        {reportType === 'status' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Status Report</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleSaveReport}>
                  {saved ? '✓ Saved' : 'Save Report'}
                </Button>
                <Button size="sm" onClick={handlePrint}>
                  <Download size={14} className="mr-1" />Print / PDF
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Report Date</label>
                  <Input type="date" value={form.reportDate} onChange={e => setForm(f => ({ ...f, reportDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Overall Status</label>
                  <Select value={form.overallStatus} onChange={e => setForm(f => ({ ...f, overallStatus: e.target.value as RAGStatus }))} options={RAG_OPTIONS} />
                </div>
              </div>

              {[
                { key: 'scopeNarrative', label: 'Scope' },
                { key: 'scheduleNarrative', label: 'Schedule' },
                { key: 'budgetNarrative', label: 'Budget' },
                { key: 'risksNarrative', label: 'Risks & Issues' },
                { key: 'nextStepsNarrative', label: 'Next Steps' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                  <Textarea
                    rows={3}
                    placeholder={`${label} status narrative...`}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {/* Print-ready preview */}
            <div ref={printRef} className="mt-8 print:mt-0 border border-slate-200 rounded-xl p-6 bg-white print:border-0">
              <div className="border-b border-slate-200 pb-4 mb-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                  <ProjectHealthBadge status={form.overallStatus} />
                </div>
                <p className="text-sm text-slate-500 mt-1">Status Report — {form.reportDate}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">{pct}%</div>
                  <div className="text-xs text-slate-500">Complete</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-slate-900">${budget.actual.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Actual / ${budget.planned.toLocaleString()} planned</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-slate-900">{milestones.filter(m => m.status !== 'completed').length}</div>
                  <div className="text-xs text-slate-500">Milestones Remaining</div>
                </div>
              </div>

              {[
                { key: 'scopeNarrative', label: 'Scope' },
                { key: 'scheduleNarrative', label: 'Schedule' },
                { key: 'budgetNarrative', label: 'Budget' },
                { key: 'risksNarrative', label: 'Risks & Issues' },
                { key: 'nextStepsNarrative', label: 'Next Steps' },
              ].filter(({ key }) => (form as any)[key]).map(({ key, label }) => (
                <div key={key} className="mb-4">
                  <h4 className="font-semibold text-slate-800 mb-1">{label}</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{(form as any)[key]}</p>
                </div>
              ))}

              {milestones.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2">Milestones</h4>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-slate-500 uppercase">
                      <tr><th className="text-left py-1">Milestone</th><th className="text-left py-1">Date</th><th className="text-left py-1">Status</th></tr>
                    </thead>
                    <tbody>
                      {milestones.map(m => (
                        <tr key={m.id} className="border-t border-slate-100">
                          <td className="py-1">{m.name}</td>
                          <td className="py-1">{format(parseISO(m.plannedEnd), 'MMM d, yyyy')}</td>
                          <td className="py-1"><span className={`text-xs px-1.5 py-0.5 rounded ${m.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{STATUS_LABEL[m.status]}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Critical Path ── */}
        {reportType === 'critical-path' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Critical Path</h2>
              <Button size="sm" variant="outline" onClick={exportCriticalPathCsv}>
                <Download size={14} className="mr-1" />Export CSV
              </Button>
            </div>

            {criticalTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <AlertTriangle size={40} className="mx-auto mb-3 opacity-50" />
                <p>No critical path computed yet. Add tasks with dependencies first.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-red-50 border-b border-red-200">
                  <p className="text-sm text-red-700">
                    <strong>{criticalTasks.length} critical tasks</strong> — these tasks have zero float and delay the project if late.
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">WBS</th>
                      <th className="px-4 py-2 text-left">Task</th>
                      <th className="px-4 py-2 text-left">Start</th>
                      <th className="px-4 py-2 text-left">Finish</th>
                      <th className="px-4 py-2 text-center">Days</th>
                      <th className="px-4 py-2 text-center">Float</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalTasks.map(t => {
                      const s = schedule[t.id]
                      return (
                        <tr key={t.id} className="border-t border-slate-100 hover:bg-red-50">
                          <td className="px-4 py-2 text-slate-400 text-xs">{t.wbsNumber}</td>
                          <td className="px-4 py-2 font-medium text-red-700">{t.name}</td>
                          <td className="px-4 py-2 text-slate-600">{s?.earlyStart}</td>
                          <td className="px-4 py-2 text-slate-600">{s?.earlyFinish}</td>
                          <td className="px-4 py-2 text-center">{t.plannedDuration}</td>
                          <td className="px-4 py-2 text-center"><span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">{s?.totalFloat ?? 0}d</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Budget Summary ── */}
        {reportType === 'budget-summary' && (
          <div className="max-w-3xl">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Budget Summary</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Planned Budget', value: `$${budget.planned.toLocaleString()}`, color: '' },
                { label: 'Actual Spend', value: `$${budget.actual.toLocaleString()}`, color: budget.isOverBudget ? 'text-red-600' : '' },
                { label: 'Variance', value: `${budget.variance >= 0 ? '+' : ''}$${budget.variance.toLocaleString()}`, color: budget.variance >= 0 ? 'text-green-600' : 'text-red-600' },
              ].map(c => (
                <div key={c.label} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500 mb-1">{c.label}</div>
                  <div className={`text-2xl font-bold ${c.color || 'text-slate-900'}`}>{c.value}</div>
                </div>
              ))}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Task</th>
                    <th className="px-4 py-2 text-right">Planned</th>
                    <th className="px-4 py-2 text-right">Actual</th>
                    <th className="px-4 py-2 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {projectTasks.filter(t => t.budgetAmount > 0 || t.actualCost > 0).map(t => {
                    const v = t.budgetAmount - t.actualCost
                    return (
                      <tr key={t.id} className="border-t border-slate-100">
                        <td className="px-4 py-2 text-slate-400 text-xs">{t.wbsNumber}</td>
                        <td className="px-4 py-2 text-right">${t.budgetAmount.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">${t.actualCost.toLocaleString()}</td>
                        <td className={`px-4 py-2 text-right font-medium ${v >= 0 ? 'text-green-600' : 'text-red-600'}`}>{v >= 0 ? '+' : ''}${v.toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
