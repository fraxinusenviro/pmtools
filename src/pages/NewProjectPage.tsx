import React from 'react'
import { useNavigate } from 'react-router-dom'
import { NewProjectModal } from '@/components/dashboard/NewProjectModal'

export function NewProjectPage() {
  const navigate = useNavigate()
  return (
    <div className="p-6">
      <NewProjectModal open={true} onClose={() => navigate('/')} />
    </div>
  )
}
