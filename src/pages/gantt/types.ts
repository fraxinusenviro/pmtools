export type ToolMode = 'select' | 'link'
export type ColorBy = 'status' | 'critical' | 'wbs' | 'assignee'
export type ColumnId = 'wbs' | 'duration' | 'start' | 'finish' | 'percent'
export type RowHeightKey = 'compact' | 'normal' | 'comfortable'

export const ROW_HEIGHTS: Record<RowHeightKey, number> = {
  compact: 28,
  normal: 36,
  comfortable: 48,
}

export const DEFAULT_COLUMNS: ColumnId[] = ['wbs', 'duration', 'start', 'finish']

export const COLUMN_LABELS: Record<ColumnId, string> = {
  wbs: 'WBS',
  duration: 'Dur',
  start: 'Start',
  finish: 'Finish',
  percent: '%',
}

export const COLUMN_WIDTHS: Record<ColumnId, number> = {
  wbs: 48,
  duration: 48,
  start: 70,
  finish: 70,
  percent: 40,
}

// Palette for WBS-level coloring (depth 0–4+)
export const WBS_PALETTE = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']
