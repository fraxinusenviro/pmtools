import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProjectShell } from '@/pages/ProjectShell'
import { ProjectOverviewPage } from '@/pages/ProjectOverviewPage'
import { TaskTablePage } from '@/pages/TaskTablePage'
import { GanttPage } from '@/pages/GanttPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { BudgetPage } from '@/pages/BudgetPage'
import { ResourcesPage } from '@/pages/ResourcesPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { AppSettingsPage } from '@/pages/AppSettingsPage'
import { NewProjectPage } from '@/pages/NewProjectPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="projects/new" element={<NewProjectPage />} />
          <Route path="projects/:id" element={<ProjectShell />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<ProjectOverviewPage />} />
            <Route path="tasks" element={<TaskTablePage />} />
            <Route path="gantt" element={<GanttPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="budget" element={<BudgetPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
          <Route path="settings" element={<AppSettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
