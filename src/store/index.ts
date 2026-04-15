import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { STORE_KEY, SCHEMA_VERSION } from '@/utils/constants'
import { generateId } from '@/utils/idGenerator'
import { computeSchedule } from '@/engine/scheduler'
import { topologicalSort, wouldCreateCycle } from '@/engine/cycleDetector'
import { computeWbsNumbers, getOrderedTaskIds } from '@/utils/wbsUtils'
import type {
  Project, Task, Dependency, Resource, Assignment,
  BudgetLine, ActualCostEntry, Baseline, StatusReport,
  ScheduledTask, RAGStatus, TaskStatus,
} from '@/types'

// ─── Seed data lazy import ────────────────────────────────────────────────────
import { seedData } from '@/seed/seedData'

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface ScheduleState {
  schedule: Record<string, ScheduledTask>
  scheduleError: string | null
}

export interface StoreState {
  // Persisted
  schemaVersion: number
  projects: Record<string, Project>
  tasks: Record<string, Task>
  dependencies: Record<string, Dependency>
  resources: Record<string, Resource>
  assignments: Record<string, Assignment>
  budgetLines: Record<string, BudgetLine>
  actualCosts: Record<string, ActualCostEntry>
  baselines: Record<string, Baseline>
  statusReports: Record<string, StatusReport>
  activeProjectId: string | null

  // UI state (not persisted)
  ganttZoom: number
  ganttScrollDate: string
  selectedTaskIds: string[]
  sidebarOpen: boolean

  // Computed (not persisted)
  schedule: Record<string, ScheduledTask>
  scheduleError: string | null

  // ─── Project Actions ────────────────────────────────────────────────────────
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'teamMemberIds' | 'baselineIds'>) => string
  updateProject: (id: string, changes: Partial<Project>) => void
  deleteProject: (id: string) => void
  setActiveProject: (id: string | null) => void

  // ─── Task Actions ───────────────────────────────────────────────────────────
  createTask: (data: Partial<Task> & { projectId: string; name: string }) => string
  updateTask: (id: string, changes: Partial<Task>) => void
  deleteTask: (id: string) => void
  indentTask: (id: string) => void
  outdentTask: (id: string) => void
  moveTask: (id: string, direction: 'up' | 'down') => void

  // ─── Dependency Actions ─────────────────────────────────────────────────────
  addDependency: (dep: Omit<Dependency, 'id'>) => string | null
  removeDependency: (id: string) => void

  // ─── Resource Actions ───────────────────────────────────────────────────────
  createResource: (data: Omit<Resource, 'id' | 'createdAt'>) => string
  updateResource: (id: string, changes: Partial<Resource>) => void
  deleteResource: (id: string) => void

  // ─── Assignment Actions ─────────────────────────────────────────────────────
  createAssignment: (data: Omit<Assignment, 'id'>) => string
  deleteAssignment: (id: string) => void

  // ─── Budget Actions ─────────────────────────────────────────────────────────
  createBudgetLine: (data: Omit<BudgetLine, 'id' | 'createdAt'>) => string
  deleteBudgetLine: (id: string) => void
  createActualCost: (data: Omit<ActualCostEntry, 'id' | 'createdAt'>) => string
  deleteActualCost: (id: string) => void

  // ─── Status Report Actions ──────────────────────────────────────────────────
  createStatusReport: (data: Omit<StatusReport, 'id' | 'createdAt'>) => string
  updateStatusReport: (id: string, changes: Partial<StatusReport>) => void

  // ─── Schedule Actions ───────────────────────────────────────────────────────
  recomputeSchedule: (projectId: string) => void

  // ─── Import / Export ────────────────────────────────────────────────────────
  importStore: (data: Partial<StoreState>) => void
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString()

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<StoreState>()(
  persist(
    immer((set, get) => ({
      schemaVersion: SCHEMA_VERSION,
      projects: {},
      tasks: {},
      dependencies: {},
      resources: {},
      assignments: {},
      budgetLines: {},
      actualCosts: {},
      baselines: {},
      statusReports: {},
      activeProjectId: null,

      // UI state
      ganttZoom: 20,
      ganttScrollDate: new Date().toISOString().slice(0, 10),
      selectedTaskIds: [],
      sidebarOpen: true,

      // Computed
      schedule: {},
      scheduleError: null,

      // ─── Project ────────────────────────────────────────────────────────────
      createProject: (data) => {
        const id = generateId()
        set(state => {
          state.projects[id] = {
            ...data,
            id,
            teamMemberIds: [],
            baselineIds: [],
            workingDays: data.workingDays ?? [1,2,3,4,5],
            holidays: data.holidays ?? [],
            hoursPerDay: data.hoursPerDay ?? 8,
            createdAt: now(),
            updatedAt: now(),
          }
        })
        return id
      },

      updateProject: (id, changes) => set(state => {
        if (!state.projects[id]) return
        Object.assign(state.projects[id], changes, { updatedAt: now() })
        // Recompute after change
      }),

      deleteProject: (id) => set(state => {
        delete state.projects[id]
        // Delete all associated data
        const taskIds = Object.values(state.tasks).filter(t => t.projectId === id).map(t => t.id)
        for (const tid of taskIds) delete state.tasks[tid]
        const depIds = Object.values(state.dependencies).filter(d => d.projectId === id).map(d => d.id)
        for (const did of depIds) delete state.dependencies[did]
        const assignIds = Object.values(state.assignments).filter(a => a.projectId === id).map(a => a.id)
        for (const aid of assignIds) delete state.assignments[aid]
        if (state.activeProjectId === id) state.activeProjectId = null
      }),

      setActiveProject: (id) => set(state => { state.activeProjectId = id }),

      // ─── Tasks ──────────────────────────────────────────────────────────────
      createTask: (data) => {
        const id = generateId()
        const project = get().projects[data.projectId]
        const siblings = Object.values(get().tasks).filter(
          t => t.projectId === data.projectId && t.parentId === (data.parentId ?? null)
        )
        const sortOrder = data.sortOrder ?? siblings.length

        set(state => {
          const task: Task = {
            id,
            projectId: data.projectId,
            name: data.name,
            description: data.description,
            isMilestone: data.isMilestone ?? false,
            isSummary: false,
            parentId: data.parentId ?? null,
            childIds: [],
            sortOrder,
            schedulingMode: data.schedulingMode ?? 'auto',
            plannedDuration: data.isMilestone ? 0 : (data.plannedDuration ?? 5),
            plannedStart: data.plannedStart ?? (project?.plannedStart ?? new Date().toISOString().slice(0,10)),
            plannedEnd: data.plannedEnd ?? (project?.plannedStart ?? new Date().toISOString().slice(0,10)),
            percentComplete: data.percentComplete ?? 0,
            status: data.status ?? 'not_started',
            assigneeIds: data.assigneeIds ?? [],
            budgetAmount: data.budgetAmount ?? 0,
            actualCost: data.actualCost ?? 0,
            notes: data.notes,
            createdAt: now(),
            updatedAt: now(),
          }
          state.tasks[id] = task

          // Update parent's childIds
          if (data.parentId && state.tasks[data.parentId]) {
            state.tasks[data.parentId].childIds.push(id)
            state.tasks[data.parentId].isSummary = true
          }
        })

        get().recomputeSchedule(data.projectId)
        return id
      },

      updateTask: (id, changes) => {
        const task = get().tasks[id]
        if (!task) return
        set(state => {
          Object.assign(state.tasks[id], changes, { updatedAt: now() })
        })
        get().recomputeSchedule(task.projectId)
      },

      deleteTask: (id) => {
        const task = get().tasks[id]
        if (!task) return
        set(state => {
          // Recursively collect all descendant IDs
          const toDelete: string[] = []
          const collect = (tid: string) => {
            toDelete.push(tid)
            const t = state.tasks[tid]
            if (t?.childIds) t.childIds.forEach(collect)
          }
          collect(id)

          for (const tid of toDelete) {
            delete state.tasks[tid]
          }

          // Remove from parent
          if (task.parentId && state.tasks[task.parentId]) {
            state.tasks[task.parentId].childIds = state.tasks[task.parentId].childIds.filter(c => c !== id)
            if (state.tasks[task.parentId].childIds.length === 0) {
              state.tasks[task.parentId].isSummary = false
            }
          }

          // Remove dependencies referencing deleted tasks
          const deleteSet = new Set(toDelete)
          for (const dep of Object.values(state.dependencies)) {
            if (deleteSet.has(dep.predecessorId) || deleteSet.has(dep.successorId)) {
              delete state.dependencies[dep.id]
            }
          }
          // Remove assignments
          for (const asgn of Object.values(state.assignments)) {
            if (deleteSet.has(asgn.taskId)) delete state.assignments[asgn.id]
          }
        })
        get().recomputeSchedule(task.projectId)
      },

      indentTask: (id) => {
        const task = get().tasks[id]
        if (!task) return
        // Find the sibling immediately above this task
        const siblings = Object.values(get().tasks)
          .filter(t => t.projectId === task.projectId && t.parentId === task.parentId && t.id !== id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
        const prevSibling = siblings.filter(s => s.sortOrder < task.sortOrder).pop()
        if (!prevSibling) return

        set(state => {
          // Remove from current parent's childIds
          if (task.parentId && state.tasks[task.parentId]) {
            state.tasks[task.parentId].childIds = state.tasks[task.parentId].childIds.filter(c => c !== id)
          }
          // Add to prev sibling's children
          state.tasks[prevSibling.id].childIds.push(id)
          state.tasks[prevSibling.id].isSummary = true
          state.tasks[id].parentId = prevSibling.id
          state.tasks[id].sortOrder = state.tasks[prevSibling.id].childIds.length - 1
        })
        get().recomputeSchedule(task.projectId)
      },

      outdentTask: (id) => {
        const task = get().tasks[id]
        if (!task || task.parentId === null) return
        const parent = get().tasks[task.parentId]
        if (!parent) return

        set(state => {
          // Remove from parent's children
          state.tasks[task.parentId!].childIds = state.tasks[task.parentId!].childIds.filter(c => c !== id)
          if (state.tasks[task.parentId!].childIds.length === 0) {
            state.tasks[task.parentId!].isSummary = false
          }
          // Add as sibling after parent
          state.tasks[id].parentId = parent.parentId
          state.tasks[id].sortOrder = parent.sortOrder + 0.5
          // Re-sort siblings
          const newSiblings = Object.values(state.tasks)
            .filter(t => t.projectId === task.projectId && t.parentId === parent.parentId)
            .sort((a, b) => a.sortOrder - b.sortOrder)
          newSiblings.forEach((t, i) => { state.tasks[t.id].sortOrder = i })
          // Add to grandparent's childIds if needed
          if (parent.parentId && state.tasks[parent.parentId]) {
            if (!state.tasks[parent.parentId].childIds.includes(id)) {
              state.tasks[parent.parentId].childIds.push(id)
            }
          }
        })
        get().recomputeSchedule(task.projectId)
      },

      moveTask: (id, direction) => {
        const task = get().tasks[id]
        if (!task) return
        const siblings = Object.values(get().tasks)
          .filter(t => t.projectId === task.projectId && t.parentId === task.parentId)
          .sort((a, b) => a.sortOrder - b.sortOrder)
        const idx = siblings.findIndex(t => t.id === id)
        if (direction === 'up' && idx === 0) return
        if (direction === 'down' && idx === siblings.length - 1) return
        const swapWith = direction === 'up' ? siblings[idx - 1] : siblings[idx + 1]

        set(state => {
          const tmp = state.tasks[id].sortOrder
          state.tasks[id].sortOrder = state.tasks[swapWith.id].sortOrder
          state.tasks[swapWith.id].sortOrder = tmp
        })
      },

      // ─── Dependencies ────────────────────────────────────────────────────────
      addDependency: (dep) => {
        const tasks = Object.values(get().tasks).filter(t => t.projectId === dep.projectId)
        const deps = Object.values(get().dependencies).filter(d => d.projectId === dep.projectId)
        if (wouldCreateCycle(tasks, deps, dep)) {
          set(state => { state.scheduleError = 'Circular dependency detected' })
          return null
        }
        const id = generateId()
        set(state => { state.dependencies[id] = { ...dep, id } })
        get().recomputeSchedule(dep.projectId)
        return id
      },

      removeDependency: (id) => {
        const dep = get().dependencies[id]
        if (!dep) return
        set(state => { delete state.dependencies[id] })
        get().recomputeSchedule(dep.projectId)
      },

      // ─── Resources ───────────────────────────────────────────────────────────
      createResource: (data) => {
        const id = generateId()
        set(state => {
          state.resources[id] = { ...data, id, createdAt: now() }
        })
        return id
      },
      updateResource: (id, changes) => set(state => {
        if (state.resources[id]) Object.assign(state.resources[id], changes)
      }),
      deleteResource: (id) => set(state => {
        delete state.resources[id]
        for (const asgn of Object.values(state.assignments)) {
          if (asgn.resourceId === id) delete state.assignments[asgn.id]
        }
      }),

      // ─── Assignments ─────────────────────────────────────────────────────────
      createAssignment: (data) => {
        const id = generateId()
        set(state => { state.assignments[id] = { ...data, id } })
        return id
      },
      deleteAssignment: (id) => set(state => { delete state.assignments[id] }),

      // ─── Budget ──────────────────────────────────────────────────────────────
      createBudgetLine: (data) => {
        const id = generateId()
        set(state => { state.budgetLines[id] = { ...data, id, createdAt: now() } })
        return id
      },
      deleteBudgetLine: (id) => set(state => { delete state.budgetLines[id] }),
      createActualCost: (data) => {
        const id = generateId()
        set(state => { state.actualCosts[id] = { ...data, id, createdAt: now() } })
        return id
      },
      deleteActualCost: (id) => set(state => { delete state.actualCosts[id] }),

      // ─── Status Reports ───────────────────────────────────────────────────────
      createStatusReport: (data) => {
        const id = generateId()
        set(state => { state.statusReports[id] = { ...data, id, createdAt: now() } })
        return id
      },
      updateStatusReport: (id, changes) => set(state => {
        if (state.statusReports[id]) Object.assign(state.statusReports[id], changes)
      }),

      // ─── Schedule Computation ─────────────────────────────────────────────────
      recomputeSchedule: (projectId) => {
        const state = get()
        const project = state.projects[projectId]
        if (!project) return

        const tasks = Object.values(state.tasks).filter(t => t.projectId === projectId)
        const deps = Object.values(state.dependencies).filter(d => d.projectId === projectId)

        try {
          const result = computeSchedule({
            tasks,
            dependencies: deps,
            projectStart: project.plannedStart,
            projectEnd: project.plannedEnd,
            workingDays: project.workingDays,
            holidays: project.holidays,
          })
          set(s => {
            Object.assign(s.schedule, result)
            s.scheduleError = null
          })
        } catch (e: any) {
          set(s => { s.scheduleError = e.message })
        }
      },

      // ─── Import ───────────────────────────────────────────────────────────────
      importStore: (data) => {
        set(state => {
          if (data.projects) state.projects = data.projects
          if (data.tasks) state.tasks = data.tasks
          if (data.dependencies) state.dependencies = data.dependencies
          if (data.resources) state.resources = data.resources
          if (data.assignments) state.assignments = data.assignments
          if (data.budgetLines) state.budgetLines = data.budgetLines
          if (data.actualCosts) state.actualCosts = data.actualCosts
          if (data.baselines) state.baselines = data.baselines || {}
          if (data.statusReports) state.statusReports = data.statusReports || {}
          if (data.activeProjectId !== undefined) state.activeProjectId = data.activeProjectId
        })
        // Recompute all schedules
        const projects = get().projects
        for (const id of Object.keys(projects)) {
          get().recomputeSchedule(id)
        }
      },
    })),
    {
      name: STORE_KEY,
      partialize: (state) => ({
        schemaVersion: state.schemaVersion,
        projects: state.projects,
        tasks: state.tasks,
        dependencies: state.dependencies,
        resources: state.resources,
        assignments: state.assignments,
        budgetLines: state.budgetLines,
        actualCosts: state.actualCosts,
        baselines: state.baselines,
        statusReports: state.statusReports,
        activeProjectId: state.activeProjectId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Load seed data on first launch
          const hasProjects = Object.keys(state.projects).length > 0
          if (!hasProjects) {
            setTimeout(() => {
              useStore.getState().importStore(seedData as any)
            }, 0)
          } else {
            // Recompute schedules after rehydration
            setTimeout(() => {
              const s = useStore.getState()
              for (const id of Object.keys(s.projects)) {
                s.recomputeSchedule(id)
              }
            }, 0)
          }
        }
      },
    }
  )
)

// ─── Convenience selectors ────────────────────────────────────────────────────

export const selectProjectTasks = (projectId: string) => (state: StoreState) =>
  Object.values(state.tasks).filter(t => t.projectId === projectId)

export const selectOrderedTaskIds = (projectId: string) => (state: StoreState) =>
  getOrderedTaskIds(state.tasks, projectId)

export const selectProjectDependencies = (projectId: string) => (state: StoreState) =>
  Object.values(state.dependencies).filter(d => d.projectId === projectId)

export const selectProjectResources = (projectId: string) => (state: StoreState) => {
  const project = state.projects[projectId]
  if (!project) return []
  return project.teamMemberIds.map(id => state.resources[id]).filter(Boolean)
}
