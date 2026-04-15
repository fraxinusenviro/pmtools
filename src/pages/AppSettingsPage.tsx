import React, { useRef, useState } from 'react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { exportStoreJson } from '@/export/exportJson'
import { Download, Upload, Trash2, Database } from 'lucide-react'
import { STORE_KEY } from '@/utils/constants'

export function AppSettingsPage() {
  const state = useStore()
  const importStore = useStore(s => s.importStore)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [importError, setImportError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = () => exportStoreJson(state)

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        importStore(data)
        setImportError('')
      } catch {
        setImportError('Invalid JSON file. Please export from PMTools first.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = () => {
    localStorage.removeItem(STORE_KEY)
    window.location.reload()
  }

  const projectCount = Object.keys(state.projects).length
  const taskCount = Object.keys(state.tasks).length
  const resourceCount = Object.keys(state.resources).length

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      {/* Data stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Database size={16} className="text-blue-500" /> Data Summary
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-slate-900">{projectCount}</div>
            <div className="text-xs text-slate-500">Projects</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{taskCount}</div>
            <div className="text-xs text-slate-500">Tasks</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{resourceCount}</div>
            <div className="text-xs text-slate-500">Resources</div>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-1">Export Data</h3>
        <p className="text-sm text-slate-500 mb-4">Download all your projects and tasks as a JSON backup file.</p>
        <Button onClick={handleExport}>
          <Download size={14} className="mr-2" />Export All (JSON)
        </Button>
      </div>

      {/* Import */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-1">Import Data</h3>
        <p className="text-sm text-slate-500 mb-4">Restore from a previously exported JSON backup. This will replace all current data.</p>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="sr-only" />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload size={14} className="mr-2" />Import JSON
        </Button>
        {importError && <p className="text-sm text-red-600 mt-2">{importError}</p>}
      </div>

      {/* Reset */}
      <div className="bg-white rounded-xl border border-red-200 p-5">
        <h3 className="font-semibold text-red-700 mb-1">Reset App</h3>
        <p className="text-sm text-slate-500 mb-4">Delete all data and reload with demo projects. This cannot be undone.</p>
        <Button variant="destructive" onClick={() => setResetConfirm(true)}>
          <Trash2 size={14} className="mr-2" />Reset All Data
        </Button>
      </div>

      <ConfirmDialog
        open={resetConfirm}
        onClose={() => setResetConfirm(false)}
        onConfirm={handleReset}
        title="Reset All Data?"
        message="This will permanently delete all projects, tasks, and resources. The app will reload with demo data."
        confirmLabel="Reset"
        destructive
      />
    </div>
  )
}
