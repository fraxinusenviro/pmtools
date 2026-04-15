import React from 'react'
import type { RAGStatus } from '@/types'

interface ProjectHealthBadgeProps {
  status: RAGStatus
  size?: 'sm' | 'md'
}

const labels = { green: 'On Track', amber: 'At Risk', red: 'Off Track' }
const colors = {
  green: 'bg-green-100 text-green-800 border-green-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  red: 'bg-red-100 text-red-800 border-red-200',
}
const dots = { green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500' }

export function ProjectHealthBadge({ status, size = 'md' }: ProjectHealthBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {labels[status]}
    </span>
  )
}
