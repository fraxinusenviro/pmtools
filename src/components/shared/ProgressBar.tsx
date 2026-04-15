import React from 'react'
import { clsx } from 'clsx'

interface ProgressBarProps {
  value: number  // 0-100
  className?: string
  showLabel?: boolean
  color?: 'blue' | 'green' | 'amber' | 'red'
}

export function ProgressBar({ value, className, showLabel, color = 'blue' }: ProgressBarProps) {
  const colors = { blue: 'bg-blue-500', green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500' }
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', colors[color])} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>}
    </div>
  )
}
