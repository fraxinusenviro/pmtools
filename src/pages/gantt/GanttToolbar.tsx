import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  MousePointer2, Link2, ZoomIn, ZoomOut, AlignLeft, ChevronsLeft,
  Download, ChevronDown, Check, X, Eye, Rows3,
} from 'lucide-react'
import type { ToolMode, ColorBy, ColumnId, RowHeightKey } from './types'
import { COLUMN_LABELS, DEFAULT_COLUMNS } from './types'
import type { DependencyType } from '@/types'

// ─── Simple dropdown wrapper ──────────────────────────────────────────────────

function Dropdown({ label, children, disabled }: { label: React.ReactNode; children: React.ReactNode; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 h-8 px-2.5 text-xs rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
      >
        {label}
        <ChevronDown size={11} className="text-slate-400" />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 min-w-[140px] rounded-md border border-slate-200 bg-white shadow-lg py-1"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function DropItem({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-6 bg-slate-200 mx-1 flex-shrink-0" />
}

// ─── Column visibility popover ────────────────────────────────────────────────

const ALL_COLUMNS: ColumnId[] = ['wbs', 'duration', 'start', 'finish', 'percent']

function ColumnsPopover({ visible, onChange }: { visible: ColumnId[]; onChange: (v: ColumnId[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = (col: ColumnId) => {
    const next = visible.includes(col) ? visible.filter(c => c !== col) : [...visible, col]
    onChange(next)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 h-8 px-2.5 text-xs rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        title="Toggle columns"
      >
        <Rows3 size={13} />
        <span className="hidden sm:inline">Columns</span>
        <ChevronDown size={11} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-40 rounded-md border border-slate-200 bg-white shadow-lg py-1">
          {ALL_COLUMNS.map(col => (
            <button
              key={col}
              onClick={() => toggle(col)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${visible.includes(col) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                {visible.includes(col) && <Check size={9} className="text-white" />}
              </span>
              {COLUMN_LABELS[col]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Toolbar Props ────────────────────────────────────────────────────────────

export interface GanttToolbarProps {
  // Tool mode
  toolMode: ToolMode
  onToolMode: (t: ToolMode) => void
  // Link options (shown when link tool active)
  newLinkType: DependencyType
  onNewLinkType: (t: DependencyType) => void
  newLinkLag: number
  onNewLinkLag: (n: number) => void
  // Zoom
  zoomIdx: number
  onZoomIn: () => void
  onZoomOut: () => void
  zoomLabel: string
  maxZoom: number
  // Navigation
  onJumpToday: () => void
  onJumpStart: () => void
  // View options
  colorBy: ColorBy
  onColorBy: (v: ColorBy) => void
  showLabels: boolean
  onShowLabels: (v: boolean) => void
  rowHeight: RowHeightKey
  onRowHeight: (v: RowHeightKey) => void
  visibleColumns: ColumnId[]
  onVisibleColumns: (v: ColumnId[]) => void
  // Baseline
  hasBaseline: boolean
  onSetBaseline: () => void
  onClearBaseline: () => void
  // Export
  onExportSvg: () => void
  onExportPng: () => void
  // Status
  hasCriticalPath: boolean
  scheduleError: string | null
}

// ─── Toolbar Component ────────────────────────────────────────────────────────

export function GanttToolbar({
  toolMode, onToolMode,
  newLinkType, onNewLinkType, newLinkLag, onNewLinkLag,
  zoomIdx, onZoomIn, onZoomOut, zoomLabel, maxZoom,
  onJumpToday, onJumpStart,
  colorBy, onColorBy, showLabels, onShowLabels, rowHeight, onRowHeight,
  visibleColumns, onVisibleColumns,
  hasBaseline, onSetBaseline, onClearBaseline,
  onExportSvg, onExportPng,
  hasCriticalPath, scheduleError,
}: GanttToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-200 bg-white flex-shrink-0 flex-wrap">

      {/* ── Drawing tools ─────────────────────────────────── */}
      <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
        <button
          title="Select tool (move & resize bars)"
          onClick={() => onToolMode('select')}
          className={`inline-flex items-center justify-center w-8 h-7 rounded text-xs transition-colors ${
            toolMode === 'select' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-white hover:text-slate-700'
          }`}
        >
          <MousePointer2 size={14} />
        </button>
        <button
          title="Link tool (drag between bars to create dependency)"
          onClick={() => onToolMode('link')}
          className={`inline-flex items-center justify-center w-8 h-7 rounded text-xs transition-colors ${
            toolMode === 'link' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-white hover:text-slate-700'
          }`}
        >
          <Link2 size={14} />
        </button>
      </div>

      {/* ── Link options (only when link tool active) ──────── */}
      {toolMode === 'link' && (
        <>
          <Divider />
          <select
            value={newLinkType}
            onChange={e => onNewLinkType(e.target.value as DependencyType)}
            className="h-8 px-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-700"
            title="Dependency type for new links"
          >
            <option value="FS">FS – Finish to Start</option>
            <option value="SS">SS – Start to Start</option>
            <option value="FF">FF – Finish to Finish</option>
            <option value="SF">SF – Start to Finish</option>
          </select>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500">Lag</span>
            <input
              type="number"
              value={newLinkLag}
              onChange={e => onNewLinkLag(Number(e.target.value))}
              className="w-14 h-8 px-1.5 text-xs rounded-md border border-slate-300 text-center"
              title="Lag days for new links"
            />
            <span className="text-xs text-slate-400">d</span>
          </div>
        </>
      )}

      <Divider />

      {/* ── Zoom ──────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5">
        <Button variant="outline" size="sm" onClick={onZoomIn} disabled={zoomIdx === 0} className="h-8 w-8 p-0" title="Zoom in">
          <ZoomIn size={13} />
        </Button>
        <span className="text-xs text-slate-600 min-w-[52px] text-center px-1">{zoomLabel}</span>
        <Button variant="outline" size="sm" onClick={onZoomOut} disabled={zoomIdx === maxZoom} className="h-8 w-8 p-0" title="Zoom out">
          <ZoomOut size={13} />
        </Button>
      </div>

      <Divider />

      {/* ── Navigate ──────────────────────────────────────── */}
      <Button variant="outline" size="sm" onClick={onJumpToday} className="h-8 gap-1 text-xs px-2" title="Jump to today">
        <AlignLeft size={13} />
        <span className="hidden sm:inline">Today</span>
      </Button>
      <Button variant="outline" size="sm" onClick={onJumpStart} className="h-8 gap-1 text-xs px-2" title="Jump to project start">
        <ChevronsLeft size={13} />
        <span className="hidden sm:inline">Start</span>
      </Button>

      <Divider />

      {/* ── View options ───────────────────────────────────── */}
      <Dropdown label={<><Eye size={13} /> <span className="hidden sm:inline">Color By</span></>}>
        {([
          ['status', 'Status'],
          ['critical', 'Critical Path'],
          ['wbs', 'WBS Level'],
          ['assignee', 'Assignee'],
        ] as [ColorBy, string][]).map(([val, label]) => (
          <DropItem key={val} onClick={() => onColorBy(val)}>
            {colorBy === val && <Check size={12} className="text-blue-600" />}
            {colorBy !== val && <span className="w-3" />}
            {label}
          </DropItem>
        ))}
      </Dropdown>

      <button
        onClick={() => onShowLabels(!showLabels)}
        title="Show task labels on bars"
        className={`inline-flex items-center gap-1 h-8 px-2.5 text-xs rounded-md border transition-colors ${
          showLabels ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        <span className="font-medium text-[11px]">Abc</span>
        <span className="hidden sm:inline">Labels</span>
      </button>

      <Dropdown label={<>Row</>}>
        {([['compact', 'Compact'], ['normal', 'Normal'], ['comfortable', 'Comfortable']] as [RowHeightKey, string][]).map(([val, label]) => (
          <DropItem key={val} onClick={() => onRowHeight(val)}>
            {rowHeight === val ? <Check size={12} className="text-blue-600" /> : <span className="w-3" />}
            {label}
          </DropItem>
        ))}
      </Dropdown>

      <ColumnsPopover visible={visibleColumns} onChange={onVisibleColumns} />

      <Divider />

      {/* ── Baseline ──────────────────────────────────────── */}
      <Dropdown label="Baseline">
        <DropItem onClick={onSetBaseline}>Set Baseline</DropItem>
        <DropItem onClick={onClearBaseline} disabled={!hasBaseline}>Clear Baseline</DropItem>
      </Dropdown>

      <Divider />

      {/* ── Export ────────────────────────────────────────── */}
      <Dropdown label={<><Download size={13} /><span className="hidden sm:inline ml-1">Export</span></>}>
        <DropItem onClick={onExportSvg}>Export SVG</DropItem>
        <DropItem onClick={onExportPng}>Export PNG</DropItem>
      </Dropdown>

      {/* ── Status badges (right-aligned) ─────────────────── */}
      <div className="ml-auto flex items-center gap-2">
        {scheduleError && (
          <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
            <X size={11} /> {scheduleError}
          </span>
        )}
        {hasCriticalPath && (
          <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
            Critical path active
          </span>
        )}
      </div>

    </div>
  )
}
