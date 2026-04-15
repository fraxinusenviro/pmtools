import React from 'react'
import type { Resource } from '@/types'

interface ResourceAvatarProps {
  resource: Resource
  size?: 'sm' | 'md' | 'lg'
}

export function ResourceAvatar({ resource, size = 'md' }: ResourceAvatarProps) {
  const initials = resource.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const sizes = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' }
  return (
    <div
      title={resource.name}
      className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
      style={{ backgroundColor: resource.color || '#6366f1' }}
    >
      {initials}
    </div>
  )
}
