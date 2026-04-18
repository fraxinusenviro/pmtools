import React from 'react'
import type { Dependency, Task, ScheduledTask } from '@/types'
import { dateToX } from './GanttBar'

// ─── Props ────────────────────────────────────────────────────────────────────

interface DependencyArrowProps {
  dep: Dependency
  tasks: Record<string, Task>
  schedule: Record<string, ScheduledTask>
  orderedIds: string[]
  viewStart: Date
  pxPerDay: number
  rowHeight: number
  isSelected: boolean
  onClick: (depId: string) => void
  onDelete: (depId: string) => void
}

// ─── Path builders for each dependency type ───────────────────────────────────

function buildPath(
  dep: Dependency,
  predRow: number,
  succRow: number,
  predS: ScheduledTask,
  succS: ScheduledTask,
  viewStart: Date,
  pxPerDay: number,
  rowHeight: number,
): string {
  const predMid = predRow * rowHeight + rowHeight / 2
  const succMid = succRow * rowHeight + rowHeight / 2

  const predLeft = dateToX(predS.earlyStart, viewStart, pxPerDay)
  const predRight = dateToX(predS.earlyFinish, viewStart, pxPerDay) + pxPerDay
  const succLeft = dateToX(succS.earlyStart, viewStart, pxPerDay)
  const succRight = dateToX(succS.earlyFinish, viewStart, pxPerDay) + pxPerDay

  const ELBOW = 12

  switch (dep.type) {
    case 'FS': {
      // Right edge of pred → Left edge of succ
      const mid = predRight + Math.max((succLeft - predRight) / 2, ELBOW)
      return `M ${predRight} ${predMid} L ${mid} ${predMid} L ${mid} ${succMid} L ${succLeft} ${succMid}`
    }
    case 'SS': {
      // Left edge of pred → Left edge of succ (route around left side)
      const routeX = Math.min(predLeft, succLeft) - ELBOW
      return `M ${predLeft} ${predMid} L ${routeX} ${predMid} L ${routeX} ${succMid} L ${succLeft} ${succMid}`
    }
    case 'FF': {
      // Right edge of pred → Right edge of succ (route around right side)
      const routeX = Math.max(predRight, succRight) + ELBOW
      return `M ${predRight} ${predMid} L ${routeX} ${predMid} L ${routeX} ${succMid} L ${succRight} ${succMid}`
    }
    case 'SF': {
      // Left edge of pred → Right edge of succ
      const routeX = Math.min(predLeft, succRight) - ELBOW
      return `M ${predLeft} ${predMid} L ${routeX} ${predMid} L ${routeX} ${succMid} L ${succRight} ${succMid}`
    }
    default:
      return ''
  }
}

function getMidPoint(pathData: string): { x: number; y: number } {
  // Extract coords from path segments — use the midpoint of the middle segment
  const parts = pathData.match(/[\d.]+/g)?.map(Number) ?? []
  if (parts.length < 4) return { x: 0, y: 0 }
  // Path has 4 points: start, turn1, turn2, end → midpoint between turn1 and turn2
  const pairs: [number, number][] = []
  for (let i = 0; i + 1 < parts.length; i += 2) pairs.push([parts[i], parts[i + 1]])
  if (pairs.length >= 3) {
    return { x: (pairs[1][0] + pairs[2][0]) / 2, y: (pairs[1][1] + pairs[2][1]) / 2 }
  }
  return { x: (pairs[0][0] + pairs[pairs.length - 1][0]) / 2, y: (pairs[0][1] + pairs[pairs.length - 1][1]) / 2 }
}

// ─── DependencyArrow ──────────────────────────────────────────────────────────

export function DependencyArrow({
  dep, tasks, schedule, orderedIds, viewStart, pxPerDay, rowHeight,
  isSelected, onClick, onDelete,
}: DependencyArrowProps) {
  const pred = tasks[dep.predecessorId]
  const succ = tasks[dep.successorId]
  const predS = schedule[dep.predecessorId]
  const succS = schedule[dep.successorId]
  if (!pred || !succ || !predS || !succS) return null

  const predRow = orderedIds.indexOf(dep.predecessorId)
  const succRow = orderedIds.indexOf(dep.successorId)
  if (predRow < 0 || succRow < 0) return null

  const isCritical = predS.isCritical && succS.isCritical
  const baseColor = isCritical ? '#ef4444' : '#94a3b8'
  const activeColor = '#1d4ed8'
  const color = isSelected ? activeColor : baseColor

  const markerId = `arrow-${dep.id}`
  const pathData = buildPath(dep, predRow, succRow, predS, succS, viewStart, pxPerDay, rowHeight)
  const mid = getMidPoint(pathData)

  const typeLabel = dep.lagDays !== 0
    ? `${dep.type}${dep.lagDays > 0 ? '+' : ''}${dep.lagDays}d`
    : dep.type

  return (
    <g>
      <defs>
        <marker id={markerId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 z" fill={color} />
        </marker>
      </defs>

      {/* Invisible wider hit area for easier clicking */}
      <path
        d={pathData}
        fill="none"
        stroke="transparent"
        strokeWidth={10}
        style={{ cursor: 'pointer' }}
        onClick={e => { e.stopPropagation(); onClick(dep.id) }}
      />

      {/* Visible arrow */}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={isSelected ? 2 : 1.5}
        strokeDasharray={dep.type === 'SF' ? '4,2' : undefined}
        markerEnd={`url(#${markerId})`}
        style={{ pointerEvents: 'none' }}
      />

      {/* Type label */}
      <text
        x={mid.x} y={mid.y - 4}
        fontSize={8} fill={color}
        textAnchor="middle"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {typeLabel}
      </text>

      {/* Tooltip */}
      <title>{dep.type}: {pred.name} → {succ.name}{dep.lagDays !== 0 ? ` (lag: ${dep.lagDays}d)` : ''}</title>

      {/* Delete button (when selected) */}
      {isSelected && (
        <g
          style={{ cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); onDelete(dep.id) }}
        >
          <circle cx={mid.x} cy={mid.y + 10} r={8} fill="white" stroke="#ef4444" strokeWidth={1.5} />
          <text x={mid.x} y={mid.y + 14} fontSize={10} fill="#ef4444" textAnchor="middle" fontWeight="bold"
            style={{ userSelect: 'none' }}>×</text>
        </g>
      )}
    </g>
  )
}
