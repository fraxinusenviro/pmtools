import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={clsx('relative bg-white rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto', className || 'w-full max-w-md mx-4')}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-500"><X size={18} /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
